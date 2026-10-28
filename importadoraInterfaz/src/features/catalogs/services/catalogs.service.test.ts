// catalogs.service.test · pruebas de las llamadas de catálogos: la ruta, el cuerpo que se envía y la conversión de la respuesta
// conecta con: catalogs.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchBrands, fetchCategories, fetchMotoModels } from './catalogs.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const expectedBody = { companyId: 3, page: 1, pageSize: 500 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('catalogs.service', () => {
  it('fetchBrands: POST /brands con { companyId, page, pageSize } y convierte la respuesta', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ brandId: 1, name: 'Yamaha' }] } })
    const result = await fetchBrands(ctx)
    expect(apiClient.post).toHaveBeenCalledWith('/brands', expectedBody)
    expect(result).toEqual([{ id: 1, name: 'Yamaha', image: undefined }])
  })

  it('fetchCategories: POST /categories', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ categoryId: 2, name: 'Frenos' }] } })
    expect(await fetchCategories(ctx)).toEqual([{ id: 2, name: 'Frenos' }])
    expect(apiClient.post).toHaveBeenCalledWith('/categories', expectedBody)
  })

  it('fetchMotoModels: POST /models', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ modelId: 3, name: 'Pulsar NS 200' }] } })
    expect(await fetchMotoModels(ctx)).toEqual([{ id: 3, name: 'Pulsar NS 200' }])
    expect(apiClient.post).toHaveBeenCalledWith('/models', expectedBody)
  })

  it('si el backend devuelve data nulo, la lista queda vacía', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    expect(await fetchBrands(ctx)).toEqual([])
  })
})
