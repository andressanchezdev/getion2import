// shop.products.service.test · pruebas de las llamadas de productos: ruta, cuerpo (solo con los filtros aplicados) y conversión de la respuesta
// conecta con: shop.products.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { buildProductsBody, fetchProductsPage, searchProducts } from './shop.products.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { post: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 2, pageSize: 30, totalRecords: 75, totalPages: 3, hasNextPage: true, hasPrevPage: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildProductsBody', () => {
  it('sin filtros solo lleva empresa, página, tamaño y activos', () => {
    expect(buildProductsBody(ctx, { page: 1, pageSize: 30 })).toEqual({ companyId: 3, page: 1, pageSize: 30, isActive: true })
  })

  it('agrega bodega, marca y categoría como listas de ids', () => {
    expect(buildProductsBody(ctx, { page: 2, pageSize: 30, warehouseId: 4, brandId: 5, categoryId: 6 })).toEqual({
      companyId: 3,
      page: 2,
      pageSize: 30,
      isActive: true,
      warehouseId: 4,
      brandIds: [5],
      categoryIds: [6],
    })
  })

  it('hasStock solo se envía cuando se quiere "con stock" (false significaría "sin stock")', () => {
    expect(buildProductsBody(ctx, { page: 1, pageSize: 30, onlyInStock: true })).toHaveProperty('hasStock', true)
    expect(buildProductsBody(ctx, { page: 1, pageSize: 30, onlyInStock: false })).not.toHaveProperty('hasStock')
  })

  it('una marca o categoría en null no se envía', () => {
    const body = buildProductsBody(ctx, { page: 1, pageSize: 30, brandId: null, categoryId: null })
    expect(body).not.toHaveProperty('brandIds')
    expect(body).not.toHaveProperty('categoryIds')
  })
})

describe('fetchProductsPage', () => {
  it('llama a POST /products y devuelve productos convertidos con su meta', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: [{ productId: 1, code: 'A', description: 'Pieza A' }], meta },
    })
    const page = await fetchProductsPage(ctx, { page: 2, pageSize: 30 })
    expect(apiClient.post).toHaveBeenCalledWith('/products', expect.objectContaining({ companyId: 3, page: 2 }))
    expect(page.items[0]).toMatchObject({ id: '1', name: 'Pieza A' })
    expect(page.meta).toEqual(meta)
  })

  it('con data nulo devuelve una página vacía', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: null } })
    expect((await fetchProductsPage(ctx, { page: 1, pageSize: 30 })).items).toEqual([])
  })
})

describe('searchProducts', () => {
  it('llama a POST /inventory/search con el texto y el límite', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: [{ productId: 9, code: 'Z', productInformation: { description: 'Zeta' } }] },
    })
    const result = await searchProducts(ctx, 'zeta', 50, 2)
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/search', { companyId: 3, limit: 50, query: 'zeta', type: 'product' })
    expect(result[0]).toMatchObject({ id: '9', name: 'Zeta' })
  })
})
