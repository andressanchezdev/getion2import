// transfers.service.test · pruebas unitarias de los endpoints de traslados multibodega
// conecta con: transfers.service, apiClient y vitest
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchTraslades,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  updateTransferStatus,
  fetchWarehouseTransfers,
} from './transfers.service'
import { apiClient } from '@/api'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
      put: vi.fn(),
    },
  }
})

describe('transfers.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchTraslades mapea correctamente la lista de traslados', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          {
            saleId: 101,
            serialCode: 987654,
            invoiceStatus: 'pendiente',
            warehouseInformation: { warehouseId: 1, name: 'Bodega Principal' },
            auxWarehouseInformation: { warehouseId: 2, name: 'Bodega Norte' },
            products: [{ productId: 50, code: 'REP-01', description: 'Pastillas Freno', quantity: 4 }],
            userInformation: { name: 'Juan', lastName: 'Pérez' },
          },
        ],
      },
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as never)

    const result = await fetchTraslades(1)
    expect(result).toHaveLength(1)
    expect(result[0].saleId).toBe(101)
    expect(result[0].serialCode).toBe(987654)
    expect(result[0].originWarehouse.name).toBe('Bodega Principal')
    expect(result[0].destWarehouse.name).toBe('Bodega Norte')
    expect(result[0].products[0].quantity).toBe(4)
  })

  it('createTransfer despacha en carrito y confirma la venta de traslado', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { success: true } } as never) // carts/register
      .mockResolvedValueOnce({ data: { success: true, data: { saleId: 55, serialCode: 123456 } } } as never) // sales/register

    const res = await createTransfer(
      {
        productId: 10,
        productName: 'Bujía',
        productCode: 'BUJ-01',
        originWarehouseId: 1,
        destWarehouseId: 2,
        quantity: 3,
      },
      1,
      99
    )

    expect(apiClient.post).toHaveBeenCalledTimes(2)
    expect(res.saleId).toBe(55)
    expect(res.serialCode).toBe(123456)
  })

  it('approveTransfer y rejectTransfer llaman a los endpoints correspondientes', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } } as never)

    await approveTransfer(55, 123456)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/approved', { saleId: 55, code: 123456 })

    await rejectTransfer(55, 'Faltaron 2 unidades')
    expect(apiClient.post).toHaveBeenCalledWith('/sales/traslades/reject', {
      saleId: 55,
      reason: 'Faltaron 2 unidades',
    })
  })

  it('updateTransferStatus llama a PUT /sales/status', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } } as never)

    await updateTransferStatus(55, 'picking')
    expect(apiClient.put).toHaveBeenCalledWith('/sales/status', {
      saleId: 55,
      invoiceStatus: 'picking',
    })
  })

  it('createTransfer no manda invoiceStatus: el estado inicial lo pone el backend', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { saleId: 55, serialCode: 7 } } } as never)
    await createTransfer({ productId: 1, productName: 'x', productCode: 'x', originWarehouseId: 1, destWarehouseId: 2, quantity: 1 }, 1, 99)
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).not.toHaveProperty('invoiceStatus')
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toMatchObject({ saleType: 'traslade', auxWarehouseId: 2 })
  })

  it('createTransfer devuelve serialCode null si el backend no lo manda (no se inventa uno)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { saleId: 9 } } } as never)
    const res = await createTransfer({ productId: 1, productName: 'x', productCode: 'x', originWarehouseId: 1, destWarehouseId: 2, quantity: 1 }, 1, 99)
    expect(res).toEqual({ serialCode: null, saleId: 9 })
  })
})

describe('fetchWarehouseTransfers', () => {
  const row = (saleId: number, origin: number, dest: number) => ({
    saleId,
    serialCode: saleId,
    invoiceStatus: 'verification',
    warehouseInformation: { warehouseId: origin, name: `B${origin}` },
    auxWarehouseInformation: { warehouseId: dest, name: `B${dest}` },
    products: [],
  })

  beforeEach(() => vi.clearAllMocks())

  it('los entrantes salen de pedir la propia bodega (destino) y los salientes de las demás, filtrando por origen', async () => {
    vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
      const dest = (body as { warehouseId: number }).warehouseId
      if (dest === 1) return { data: { success: true, data: [row(10, 4, 1)] } } as never // entrante: de la 4 hacia la 1
      if (dest === 4) return { data: { success: true, data: [row(11, 1, 4), row(12, 6, 4)] } } as never // saliente de la 1 y ajeno
      return { data: { success: true, data: [] } } as never
    })
    const list = await fetchWarehouseTransfers(1, [4, 6])
    expect(list.map((item) => item.saleId).sort()).toEqual([10, 11])
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledTimes(3)
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('userId')
  })

  it('si falla la consulta de otra bodega igual muestra los entrantes', async () => {
    vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
      if ((body as { warehouseId: number }).warehouseId === 1) return { data: { success: true, data: [row(10, 4, 1)] } } as never
      throw new Error('boom')
    })
    expect((await fetchWarehouseTransfers(1, [4])).map((item) => item.saleId)).toEqual([10])
  })

  it('si falla la consulta de la propia bodega, falla (no se muestra una lista engañosa)', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'))
    await expect(fetchWarehouseTransfers(1, [4])).rejects.toThrow('boom')
  })
})
