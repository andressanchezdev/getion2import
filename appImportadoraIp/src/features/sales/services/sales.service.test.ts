// sales.service.test · pruebas de las llamadas de historial y pendientes: cuerpo enviado y conversión
// conecta con: sales.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchPendingCarts, fetchSalesHistory } from './sales.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn() } }
})

const ctx = { companyId: 1, userId: 948 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => vi.clearAllMocks())

describe('fetchSalesHistory', () => {
  it('pide con companyId y warehouseId y convierte las filas', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [{ saleId: 5, totalAmount: 10 }], meta } })
    const page = await fetchSalesHistory(ctx, 4, 2, 30)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/history', { companyId: 1, warehouseId: 4, page: 2, pageSize: 30 })
    expect(page.items[0]).toMatchObject({ id: 5, totalAmount: 10 })
    expect(page.meta).toEqual(meta)
  })

  it('acepta una lista null', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: null } })
    expect((await fetchSalesHistory(ctx, 4, 1, 30)).items).toEqual([])
  })
})

describe('fetchPendingCarts', () => {
  it('pide con userId (el vendedor) y warehouseId, sin companyId', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [{ uuid: 'u1', count: 2 }], meta } })
    const page = await fetchPendingCarts(ctx, 4, 1, 30)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/pendings', { userId: 948, warehouseId: 4, page: 1, pageSize: 30 })
    expect(page.items[0]).toMatchObject({ uuid: 'u1', lines: 2 })
  })
})
