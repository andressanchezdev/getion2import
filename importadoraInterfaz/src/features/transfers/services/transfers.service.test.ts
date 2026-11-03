// transfers.service.test · pruebas de las llamadas de traslados: lista, crear, despachar, recibir, anular y búsqueda con existencias
// conecta con: transfers.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { cancelTransfer, createTransferBatch, dispatchTransfer, fetchTraslades, receiveTransfer, searchProductsMultibodega } from './transfers.service'
import type { TrasladeItem } from '../types/transfers.types'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 50, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const dto = {
  id: 11, serialCode: 'TR-11', originWarehouseId: 1, originWarehouseName: 'Principal', destinationWarehouseId: 2, destinationWarehouseName: 'Norte',
  employeeName: 'Juan', status: 'in_transit', items: [{ id: 90, productId: 50, productCode: 'REP-01', productName: 'Pastillas', quantity: 4, destinationLocation: 'A1' }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('transfers.service', () => {
  it('fetchTraslades: los entrantes filtran por bodega destino y los salientes por origen', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [dto], meta } })
    const incoming = await fetchTraslades(ctx, 'incoming', 2)
    expect(apiClient.get).toHaveBeenCalledWith('/transfers', { params: { companyId: 3, destinationWarehouseId: 2, page: 1, pageSize: 50 } })
    expect(incoming[0]).toMatchObject({ id: 11, serialCode: 'TR-11', status: 'in_transit', originWarehouse: { id: 1, name: 'Principal' }, destWarehouse: { id: 2, name: 'Norte' } })
    expect(incoming[0].products[0]).toMatchObject({ itemId: 90, productId: 50, description: 'Pastillas', quantity: 4, destinationLocation: 'A1' })
    await fetchTraslades({ companyId: 0, userId: 1 }, 'outgoing', 1)
    expect(apiClient.get).toHaveBeenLastCalledWith('/transfers', { params: { originWarehouseId: 1, page: 1, pageSize: 50 } })
  })

  it('createTransferBatch: busca la ubicación con más stock que alcance y hace POST /transfers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ stockId: 5, sellable: 3 }, { stockId: 6, sellable: 10 }, { stockId: 7, sellable: 1 }] } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { ...dto, status: 'pending' } } })
    const created = await createTransferBatch(ctx, { originWarehouseId: 1, destWarehouseId: 2, items: [{ productId: 50, quantity: 2 }] })
    expect(apiClient.get).toHaveBeenCalledWith('/stock', { params: { companyId: 3, warehouseId: 1, productId: 50, page: 1, pageSize: 200 } })
    expect(apiClient.post).toHaveBeenCalledWith('/transfers', { originWarehouseId: 1, destinationWarehouseId: 2, items: [{ productId: 50, originStockId: 6, quantity: 2 }] })
    expect(created.status).toBe('pending')
  })

  it('createTransferBatch: sin stock suficiente avisa y no crea nada', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ stockId: 5, sellable: 1 }] } })
    await expect(createTransferBatch(ctx, { originWarehouseId: 1, destWarehouseId: 2, items: [{ productId: 50, quantity: 5 }] })).rejects.toMatchObject({ userFriendlyMessage: expect.stringContaining('No hay stock') })
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('createTransferBatch: varios productos de una bodega van en un solo traslado, cada uno con su ubicación', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (_url: string, config?: { params?: unknown }) => ({
      data: { success: true, data: (config?.params as { productId?: number } | undefined)?.productId === 50 ? [{ stockId: 6, sellable: 10 }] : [{ stockId: 8, sellable: 4 }] },
    }))
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: { ...dto, status: 'pending' } } })
    await createTransferBatch(ctx, { originWarehouseId: 1, destWarehouseId: 2, items: [{ productId: 50, quantity: 2 }, { productId: 51, quantity: 3 }] })
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post).toHaveBeenCalledWith('/transfers', {
      originWarehouseId: 1,
      destinationWarehouseId: 2,
      items: [{ productId: 50, originStockId: 6, quantity: 2 }, { productId: 51, originStockId: 8, quantity: 3 }],
    })
  })

  it('dispatchTransfer, receiveTransfer y cancelTransfer llaman a sus rutas', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })
    await dispatchTransfer(11)
    expect(apiClient.post).toHaveBeenLastCalledWith('/transfers/11/dispatch', {})
    const transfer: TrasladeItem = { id: 11, serialCode: 'TR-11', type: 'standard', typeLabel: 'Solicitud entre Bodegas', priority: 'normal', status: 'in_transit', originWarehouse: { id: 1, name: 'P' }, destWarehouse: { id: 2, name: 'N' }, products: [{ itemId: 90, productId: 50, description: 'x', quantity: 4, destinationLocation: 'A1' }] }
    await receiveTransfer(transfer)
    expect(apiClient.post).toHaveBeenLastCalledWith('/transfers/11/receive', { hasNovelty: false, noveltyNotes: undefined, items: [{ itemId: 90, receivedQty: 4, destinationLocation: 'A1' }] })
    await cancelTransfer(11, 'Llegó dañado')
    expect(apiClient.post).toHaveBeenLastCalledWith('/transfers/11/cancel', { reason: 'Llegó dañado' })
  })

  it('searchProductsMultibodega: busca por texto y arma las existencias por bodega', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url === '/stock'
        ? { data: { success: true, data: [{ stockId: 1, warehouseId: 1, productId: 50, available: 10, reserved: 2, sellable: 8 }, { stockId: 2, warehouseId: 1, productId: 50, available: 5, reserved: 0, sellable: 5 }] } }
        : { data: { success: true, data: [{ id: 50, code: 'REP-01', description: 'Pastillas' }] } }
    )
    const result = await searchProductsMultibodega(ctx, [{ id: 1, name: 'Principal' }, { id: 2, name: 'Norte' }], ' pastillas ')
    expect(apiClient.get).toHaveBeenCalledWith('/products/search', { params: { q: 'pastillas', page: 1, pageSize: 5 } })
    expect(result[0]).toMatchObject({ productId: 50, code: 'REP-01', totalStock: 15, totalAvailable: 13 })
    expect(result[0].locations).toEqual([
      { warehouseId: 1, warehouseName: 'Principal', stock: 15, reservedStock: 2, availableStock: 13 },
      { warehouseId: 2, warehouseName: 'Norte', stock: 0, reservedStock: 0, availableStock: 0 },
    ])
  })

  it('searchProductsMultibodega sin texto lista los primeros productos activos', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } })
    await searchProductsMultibodega(ctx, [], '')
    expect(apiClient.get).toHaveBeenCalledWith('/products', { params: { companyId: 3, status: 'active', page: 1, pageSize: 5 } })
  })
})
