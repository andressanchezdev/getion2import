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

  it('recorre todas las páginas: con 529 categorías y páginas de 500 pide la segunda y junta las dos', async () => {
    const meta = (page: number, hasNextPage: boolean) => ({ currentPage: page, pageSize: 500, totalRecords: 529, totalPages: 2, hasNextPage, hasPrevPage: page > 1 })
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { success: true, data: [{ categoryId: 1, name: 'A' }], meta: meta(1, true) } })
      .mockResolvedValueOnce({ data: { success: true, data: [{ categoryId: 2, name: 'B' }], meta: meta(2, false) } })
    expect(await fetchCategories(ctx)).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    expect(apiClient.post).toHaveBeenCalledTimes(2)
    expect(apiClient.post).toHaveBeenLastCalledWith('/categories', { companyId: 3, page: 2, pageSize: 500 })
  })

  it('se detiene si una página llega vacía aunque diga que hay siguiente (no hay bucle infinito)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [], meta: { currentPage: 1, pageSize: 500, totalRecords: 9, totalPages: 9, hasNextPage: true, hasPrevPage: false } } })
    expect(await fetchMotoModels(ctx)).toEqual([])
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })

  it('con varias páginas pide las demás en paralelo y respeta el orden', async () => {
    const meta = (page: number) => ({ currentPage: page, pageSize: 500, totalRecords: 1200, totalPages: 3, hasNextPage: page < 3, hasPrevPage: page > 1 })
    vi.mocked(apiClient.post).mockImplementation(async (_url, body) => {
      const page = (body as { page: number }).page
      // la página 3 responde antes que la 2: el resultado igual debe salir en orden
      await new Promise((resolve) => setTimeout(resolve, page === 2 ? 20 : 0))
      return { data: { success: true, data: [{ modelId: page, name: `M${page}` }], meta: meta(page) } }
    })
    expect((await fetchMotoModels(ctx)).map((row) => row.id)).toEqual([1, 2, 3])
    expect(apiClient.post).toHaveBeenCalledTimes(3)
  })

  it('si el catálogo supera el tope de páginas falla con un mensaje (no devuelve la lista cortada)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: [{ brandId: 1, name: 'A' }], meta: { currentPage: 1, pageSize: 500, totalRecords: 12000, totalPages: 24, hasNextPage: true, hasPrevPage: false } } })
    await expect(fetchBrands(ctx)).rejects.toThrow('24 páginas')
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
})
