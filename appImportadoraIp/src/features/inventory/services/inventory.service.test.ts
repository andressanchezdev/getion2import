// inventory.service.test · pruebas de las llamadas del control de inventario: cuerpo enviado y conversión
// conecta con: inventory.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { buildFilterBody, fetchInventoryPage, searchInventory } from './inventory.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn() } }
})

const ctx = { companyId: 1, userId: 948 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 8205, totalPages: 274, hasNextPage: true, hasPrevPage: false }

beforeEach(() => vi.clearAllMocks())

describe('buildFilterBody', () => {
  it('solo lleva los filtros aplicados', () => {
    expect(buildFilterBody(ctx, { page: 1, pageSize: 30, onlyInStock: false })).toEqual({ companyId: 1, page: 1, pageSize: 30 })
    expect(buildFilterBody(ctx, { page: 2, pageSize: 30, warehouseId: 4, onlyInStock: true })).toEqual({ companyId: 1, page: 2, pageSize: 30, warehouseId: 4, hasStock: true })
  })
})

describe('fetchInventoryPage', () => {
  it('usa POST /inventory/filter y convierte las filas con la bodega elegida', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: [{ productId: 1, code: 'A', locations: [{ warehouseId: 4, physicalStock: 7 }, { warehouseId: 1, physicalStock: 2 }], inventory: { physicalTotal: 9 } }], meta },
    })
    const page = await fetchInventoryPage(ctx, { page: 1, pageSize: 30, warehouseId: 4, onlyInStock: false })
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/filter', { companyId: 1, page: 1, pageSize: 30, warehouseId: 4 })
    expect(page.items[0]).toMatchObject({ id: 1, warehouseStock: 7, physicalTotal: 9 })
    expect(page.meta).toEqual(meta)
  })
})

describe('searchInventory', () => {
  it('usa POST /inventory/search con type product y el texto recortado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [{ productId: 5, code: 'Z' }] } })
    const items = await searchInventory(ctx, ' filtro ', 50)
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/search', { companyId: 1, limit: 50, query: 'filtro', type: 'product' })
    expect(items[0].id).toBe(5)
  })

  it('acepta una lista null', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: null } })
    expect(await searchInventory(ctx, 'x', 50)).toEqual([])
  })
})
