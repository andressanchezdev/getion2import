// shop.products.service.test · pruebas de las llamadas de productos: ruta, parámetros (solo con los filtros aplicados), unión con el stock y conversión
// conecta con: shop.products.service y shop.stock.service; el cliente HTTP está simulado (no hay red)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api'
import { buildProductsParams, fetchProductsPage, searchProducts } from './shop.products.service'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  apiClient: { get: vi.fn() },
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 2, pageSize: 30, totalRecords: 75, totalPages: 3, hasNextPage: true, hasPrevPage: true }
const lastPage = { currentPage: 1, pageSize: 200, totalRecords: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const stockRows = [
  { stockId: 1, warehouseId: 4, productId: 1, location: 'A-700', available: 6, reserved: 1, sellable: 5 },
  { stockId: 2, warehouseId: 4, productId: 2, location: 'B-1', available: 0, reserved: 0, sellable: 0 },
]

// responde según la ruta: /products, /products/search o /stock
const mockApi = (products: unknown[], productsMeta = meta) =>
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === '/stock') return { data: { success: true, data: stockRows, meta: lastPage } }
    return { data: { success: true, data: products, meta: productsMeta } }
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildProductsParams', () => {
  it('sin filtros solo lleva compañía, página, tamaño y activos', () => {
    expect(buildProductsParams(ctx, { page: 1, pageSize: 30 })).toEqual({ companyId: 3, page: 1, pageSize: 30, status: 'active' })
  })

  it('agrega marca y categoría; una en null no se envía', () => {
    expect(buildProductsParams(ctx, { page: 2, pageSize: 30, brandId: 5, categoryId: 6 })).toMatchObject({ brandId: 5, categoryId: 6 })
    const params = buildProductsParams(ctx, { page: 1, pageSize: 30, brandId: null, categoryId: null })
    expect(params).not.toHaveProperty('brandId')
    expect(params).not.toHaveProperty('categoryId')
  })

  it('el superadmin (sin compañía) no manda companyId', () => {
    expect(buildProductsParams({ companyId: 0, userId: 1 }, { page: 1, pageSize: 30 })).not.toHaveProperty('companyId')
  })
})

describe('fetchProductsPage', () => {
  it('llama a GET /products, une el stock de la bodega y devuelve la meta', async () => {
    mockApi([
      { id: 1, code: 'A', name: 'Pieza A' },
      { id: 2, code: 'B', name: 'Pieza B' },
    ])
    const page = await fetchProductsPage(ctx, { page: 2, pageSize: 30, warehouseId: 4 })
    expect(apiClient.get).toHaveBeenCalledWith('/products', { params: { companyId: 3, page: 2, pageSize: 30, status: 'active' } })
    expect(apiClient.get).toHaveBeenCalledWith('/stock', { params: { companyId: 3, warehouseId: 4, page: 1, pageSize: 200 } })
    expect(page.items[0]).toMatchObject({ id: '1', name: 'Pieza A', stockByWarehouse: { '4': 5 }, location: 'A-700' })
    expect(page.meta).toEqual(meta)
  })

  it('sin bodega no pide el stock', async () => {
    mockApi([{ id: 1, code: 'A' }])
    await fetchProductsPage(ctx, { page: 1, pageSize: 30 })
    expect(apiClient.get).not.toHaveBeenCalledWith('/stock', expect.anything())
  })

  it('"solo con stock" deja los productos con stock vendible y pagina en memoria', async () => {
    mockApi(
      [
        { id: 1, code: 'A' },
        { id: 2, code: 'B' },
      ],
      lastPage
    )
    const page = await fetchProductsPage(ctx, { page: 1, pageSize: 30, warehouseId: 4, onlyInStock: true })
    expect(page.items.map((p) => p.id)).toEqual(['1'])
    expect(page.meta).toMatchObject({ totalRecords: 1, totalPages: 1 })
  })

  it('con data nulo devuelve una página vacía', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: null } })
    expect((await fetchProductsPage(ctx, { page: 1, pageSize: 30 })).items).toEqual([])
  })
})

describe('searchProducts', () => {
  it('llama a GET /products/search con el texto y el límite, y deja solo los activos', async () => {
    mockApi([
      { id: 1, code: 'Z', name: 'Zeta', status: 'active' },
      { id: 3, code: 'Y', status: 'inactive' },
    ])
    const result = await searchProducts(ctx, 'zeta', 50, 4)
    expect(apiClient.get).toHaveBeenCalledWith('/products/search', { params: { q: 'zeta', page: 1, pageSize: 50 } })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: '1', name: 'Zeta', stockByWarehouse: { '4': 5 } })
  })
})
