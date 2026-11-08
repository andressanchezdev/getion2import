// shop.products.service · llamadas al backend de productos: GET /products (catálogo con filtros y páginas) y GET /products/search (texto)
// conecta con: api/client, api/config, api/params y api/pagination, shop.stock.service (stock de la bodega) y shop.adapter (convierte a Product); las usa shop.products.thunks
// ojo: el companyId llega en el contexto de petición; este service no lee el almacenamiento ni el store
// ojo: la API no filtra por "solo con stock": ese filtro se hace aquí, con todos los productos activos y el stock de la bodega, y se pagina en memoria
import { apiClient, API_CONFIG, paginateList, toPaginated, withCompany, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { indexStock, toProduct } from '../helpers/shop.adapter'
import type { ProductDto, ProductStock, ProductsQuery, StockRowDto } from '../types/shop.api.types'
import { toApiPriceTier } from '@/global/helpers/pricing/priceTier'
import type { NewProductInput, Product, ProductPrices } from '../types/shop.types'
import { fetchWarehouseStock } from './shop.stock.service'

const { PRODUCTS } = API_CONFIG.ENDPOINTS
const ALL_PAGE_SIZE = 200 // tamaño máximo de página de la API
const ALL_MAX_PAGES = 25 // tope de seguridad al traer todos los productos

// parámetros de GET /products: solo los filtros que realmente están aplicados (solo productos activos, salvo que se pida incluir los inactivos)
export const buildProductsParams = (ctx: RequestContext, query: Pick<ProductsQuery, 'page' | 'pageSize' | 'brandId' | 'categoryId' | 'includeInactive'>) =>
    withCompany(ctx.companyId, {
        page: query.page,
        pageSize: query.pageSize,
        status: query.includeInactive ? undefined : 'active',
        brandId: query.brandId,
        categoryId: query.categoryId,
    })

// stock de la bodega elegida desglosado por producto
const stockOf = async (ctx: RequestContext, warehouseId?: number): Promise<Map<number, ProductStock>> => {
    if (warehouseId === undefined) return new Map()
    const rows: StockRowDto[] = await fetchWarehouseStock(ctx, warehouseId)
    return indexStock(rows, warehouseId)
}

// une cada producto con sus existencias en la bodega
const withStock = (dtos: ProductDto[], stock: Map<number, ProductStock>, warehouseId?: number): Product[] =>
    dtos.map((dto) => toProduct(dto, warehouseId, stock.get(dto.id)))

// todos los productos activos que cumplen los filtros (de 200 en 200)
const fetchAllProducts = async (ctx: RequestContext, query: ProductsQuery): Promise<ProductDto[]> => {
    const all: ProductDto[] = []
    for (let page = 1; page <= ALL_MAX_PAGES; page++) {
        const { data } = await apiClient.get<APIResponse<ProductDto[] | null>>(PRODUCTS.LIST, {
            params: buildProductsParams(ctx, { ...query, page, pageSize: ALL_PAGE_SIZE }),
        })
        const result = toPaginated(data)
        all.push(...result.items)
        if (!result.meta.hasNextPage) break
    }
    return all
}

// una página del catálogo: los productos ya convertidos y los metadatos de paginación
export const fetchProductsPage = async (ctx: RequestContext, query: ProductsQuery): Promise<Paginated<Product>> => {
    const stock = await stockOf(ctx, query.warehouseId)
    if (query.onlyInStock && query.warehouseId !== undefined) {
        const inStock = (await fetchAllProducts(ctx, query)).filter((dto) => (stock.get(dto.id)?.sellable ?? 0) > 0)
        const page = paginateList(inStock, query.page, query.pageSize)
        return { items: withStock(page.items, stock, query.warehouseId), meta: page.meta }
    }
    const { data } = await apiClient.get<APIResponse<ProductDto[] | null>>(PRODUCTS.LIST, { params: buildProductsParams(ctx, query) })
    const page = toPaginated(data)
    return { items: withStock(page.items, stock, query.warehouseId), meta: page.meta }
}

// búsqueda por texto (código, nombre, marca, modelo o categoría): hasta `limit` resultados, solo activos salvo que se pida incluir los inactivos
export const searchProducts = async (ctx: RequestContext, text: string, limit: number, warehouseId?: number, includeInactive = false): Promise<Product[]> => {
    const { data } = await apiClient.get<APIResponse<ProductDto[] | null>>(PRODUCTS.SEARCH, { params: { q: text, page: 1, pageSize: limit } })
    const found = (data.data ?? []).filter((dto) => includeInactive || !dto.status || dto.status === 'active')
    return withStock(found, await stockOf(ctx, warehouseId), warehouseId)
}

// cambia las tarifas de un producto (PUT /products/:id con { prices }): P0..P3 de la app viajan como p1..p4 y la API responde el producto con todas sus tarifas
export const updateProductPrices = async (productId: number | string, prices: ProductPrices): Promise<ProductDto> => {
    const body: Record<string, number> = {}
    for (const [level, price] of Object.entries(prices)) body[toApiPriceTier(level.toUpperCase() as 'P0' | 'P1' | 'P2' | 'P3')] = price
    const { data } = await apiClient.put<APIResponse<ProductDto>>(PRODUCTS.BY_ID(Number(productId)), { prices: body })
    return data.data
}

// crea un producto (POST /products): P0..P3 de la app viajan como p1..p4; initialStock lo deja guardado en las ubicaciones elegidas; devuelve el producto creado
export const createProduct = async (input: NewProductInput): Promise<Product> => {
    const prices: Record<string, number> = {}
    for (const [level, price] of Object.entries(input.prices)) prices[toApiPriceTier(level.toUpperCase() as 'P0' | 'P1' | 'P2' | 'P3')] = price
    const body = {
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        categoryId: input.categoryId,
        brandId: input.brandId,
        modelId: input.modelId,
        unit: input.unit?.trim() || undefined,
        lastCost: input.lastCost,
        prices,
        isNew: input.isNew,
        iva: input.iva,
        status: input.status,
        initialStock: input.initialStock?.map((item) => ({ warehouseId: item.warehouseId, location: item.location, quantity: item.quantity })),
    }
    const { data } = await apiClient.post<APIResponse<ProductDto>>(PRODUCTS.LIST, body)
    return toProduct(data.data)
}

// cambia el estado de un producto (PUT /products/:id con { status: 'active' | 'inactive' })
export const updateProductStatus = async (productId: number | string, status: 'active' | 'inactive'): Promise<ProductDto> => {
    const { data } = await apiClient.put<APIResponse<ProductDto>>(PRODUCTS.BY_ID(Number(productId)), { status })
    return data.data
}

// actualiza campos del producto (nombre, descripción, código, estado, precios, categoría, nuevo)
export const updateProductDetails = async (
    productId: number | string,
    updates: {
        name?: string
        description?: string
        code?: string
        status?: 'active' | 'inactive'
        prices?: ProductPrices
        categoryId?: number
        brandId?: number
        modelId?: number
        isNew?: boolean
        iva?: number
        reason?: string // obligatorio (10 a 100) al pasar a inactivo
    }
): Promise<ProductDto> => {
    const body: Record<string, unknown> = {}
    if (updates.name !== undefined) body.name = updates.name
    if (updates.description !== undefined) body.description = updates.description
    if (updates.code !== undefined) body.code = updates.code
    if (updates.status !== undefined) body.status = updates.status
    if (updates.categoryId !== undefined) body.categoryId = updates.categoryId
    if (updates.brandId !== undefined) body.brandId = updates.brandId
    if (updates.modelId !== undefined) body.modelId = updates.modelId
    if (updates.isNew !== undefined) body.isNew = updates.isNew
    if (updates.iva !== undefined) body.iva = updates.iva
    if (updates.reason !== undefined) body.reason = updates.reason
    if (updates.prices) {
        const pricesBody: Record<string, number> = {}
        for (const [level, price] of Object.entries(updates.prices)) {
            pricesBody[toApiPriceTier(level.toUpperCase() as 'P0' | 'P1' | 'P2' | 'P3')] = price
        }
        body.prices = pricesBody
    }
    const { data } = await apiClient.put<APIResponse<ProductDto>>(PRODUCTS.BY_ID(Number(productId)), body)
    return data.data
}
