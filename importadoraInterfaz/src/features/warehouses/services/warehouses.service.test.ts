// warehouses.service.test · pruebas de GET /warehouses: la ruta, los parámetros que se envían y la conversión de la respuesta
// conecta con: warehouses.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchWarehouses } from './warehouses.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchWarehouses', () => {
  it('envía page y pageSize (la compañía va en el token) y convierte las bodegas', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 1, code: 'BOD1', name: 'Principal', isActive: true },
          { id: 2, name: 'Cerrada', isActive: false },
        ],
        meta: { currentPage: 1, pageSize: 100, totalRecords: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      },
    })
    const result = await fetchWarehouses()
    expect(apiClient.get).toHaveBeenCalledWith('/warehouses', { params: { page: 1, pageSize: 100 } })
    expect(result.map((w) => w.id)).toEqual(['1'])
  })

  it('con data nulo devuelve una lista vacía', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: null } })
    expect(await fetchWarehouses()).toEqual([])
  })
})
