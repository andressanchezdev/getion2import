// catalogs.service.test · pruebas de las llamadas de catálogos: la ruta, los parámetros que se envían y la conversión de la respuesta
// conecta con: catalogs.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { fetchBrands, fetchCategories, fetchMotoModels } from './catalogs.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const expectedConfig = { params: { companyId: 3, activeOnly: true } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('catalogs.service', () => {
  it('fetchBrands: GET /brands con companyId y activeOnly, y convierte la respuesta', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, name: 'Yamaha' }] } })
    const result = await fetchBrands(ctx)
    expect(apiClient.get).toHaveBeenCalledWith('/brands', expectedConfig)
    expect(result).toEqual([{ id: 1, name: 'Yamaha', image: undefined }])
  })

  it('fetchCategories: GET /categories', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 2, name: 'Frenos' }] } })
    expect(await fetchCategories(ctx)).toEqual([{ id: 2, name: 'Frenos' }])
    expect(apiClient.get).toHaveBeenCalledWith('/categories', expectedConfig)
  })

  it('fetchMotoModels: GET /models', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 3, name: 'Pulsar NS 200' }] } })
    expect(await fetchMotoModels(ctx)).toEqual([{ id: 3, name: 'Pulsar NS 200' }])
    expect(apiClient.get).toHaveBeenCalledWith('/models', expectedConfig)
  })

  it('el superadmin (sin compañía) no manda companyId', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } })
    await fetchBrands({ companyId: 0, userId: 1 })
    expect(apiClient.get).toHaveBeenCalledWith('/brands', { params: { activeOnly: true } })
  })

  it('si la API devuelve data nulo, la lista queda vacía', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: null } })
    expect(await fetchBrands(ctx)).toEqual([])
  })
})
