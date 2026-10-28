// transfers.service.test · pruebas unitarias de los endpoints de traslados multibodega
// conecta con: transfers.service, apiClient y vitest
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchTraslades,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  updateTransferStatus,
} from './transfers.service'
import { apiClient } from '@/api'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<any>('@/api')
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
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as any)

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
      .mockResolvedValueOnce({ data: { success: true } } as any) // carts/register
      .mockResolvedValueOnce({ data: { success: true, data: { saleId: 55, serialCode: 123456 } } } as any) // sales/register

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
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } } as any)

    await approveTransfer(55, 123456)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/approved', { saleId: 55, code: 123456 })

    await rejectTransfer(55, 'Faltaron 2 unidades')
    expect(apiClient.post).toHaveBeenCalledWith('/sales/traslades/reject', {
      saleId: 55,
      reason: 'Faltaron 2 unidades',
    })
  })

  it('updateTransferStatus llama a PUT /sales/status', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } } as any)

    await updateTransferStatus(55, 'picking_verified')
    expect(apiClient.put).toHaveBeenCalledWith('/sales/status', {
      saleId: 55,
      invoiceStatus: 'picking_verified',
    })
  })
})
