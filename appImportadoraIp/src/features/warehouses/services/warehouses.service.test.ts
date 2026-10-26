// warehouses.service.test · pruebas de POST /warehouses: la ruta, el cuerpo que se envía y la conversión de la respuesta
// conecta con: warehouses.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchWarehouses } from './warehouses.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchWarehouses', () => {
  it('envía companyId, page y pageSize y convierte las bodegas', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: [
          { warehouseId: 1, name: 'Principal', isMain: true, isActive: true },
          { warehouseId: 2, name: 'Cerrada', isActive: false },
        ],
        meta: { currentPage: 1, pageSize: 100, totalRecords: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      },
    })
    const result = await fetchWarehouses({ companyId: 3, userId: 7 })
    expect(apiClient.post).toHaveBeenCalledWith('/warehouses', { companyId: 3, page: 1, pageSize: 100 })
    expect(result.map((w) => w.id)).toEqual(['1'])
  })

  it('con data nulo devuelve una lista vacía', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    expect(await fetchWarehouses({ companyId: 3, userId: 7 })).toEqual([])
  })
})
