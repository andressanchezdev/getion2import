// suppliers.service.test · pruebas de las llamadas de proveedores: cuerpo enviado y conversión
// conecta con: suppliers.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchSuppliersPage, fetchSuppliersSummary } from './suppliers.service'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api')
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } }
})

const ctx = { companyId: 1, userId: 948 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 26, totalPages: 1, hasNextPage: false, hasPrevPage: false }

beforeEach(() => vi.clearAllMocks())

describe('fetchSuppliersPage', () => {
  it('pide la página y convierte las filas; sin texto no manda search', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: [{ supplierId: 1, name: 'A' }], meta } })
    const page = await fetchSuppliersPage(ctx, 2, 30, '   ')
    expect(apiClient.post).toHaveBeenCalledWith('/suppliers/list', { companyId: 1, page: 2, pageSize: 30 })
    expect(page.items[0]).toMatchObject({ id: 1, name: 'A' })
    expect(page.meta).toEqual(meta)
  })

  it('con texto manda search recortado', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: null } })
    const page = await fetchSuppliersPage(ctx, 1, 30, ' moto ')
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ search: 'moto' })
    expect(page.items).toEqual([])
  })
})

describe('fetchSuppliersSummary', () => {
  it('usa GET /suppliers/summary con companyId en la query (sin él el backend responde 400)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { success: true, data: { totalSuppliers: 26, activeSuppliers: 20, totalProducts: 100, totalCreditLimit: 9 } } })
    expect(await fetchSuppliersSummary(ctx)).toEqual({ total: 26, active: 20, products: 100, totalCreditLimit: 9 })
    expect(apiClient.get).toHaveBeenCalledWith('/suppliers/summary', { params: { companyId: 1 } })
  })
})
