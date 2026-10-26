// shop.products.service · llamadas al backend de productos: POST /products (catálogo con filtros y páginas) y POST /inventory/search (búsqueda por texto)
// conecta con: api/client, api/config y api/pagination, shop.adapter (convierte la respuesta a Product); las usa shop.products.thunks
// ojo: el companyId llega en el contexto de petición; este service no lee el almacenamiento ni el store.
// ojo: en /products, hasStock=false significa "solo SIN stock", por eso solo se envía cuando se quiere "con stock"; los filtros vacíos tampoco se envían
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toProduct, toProductFromControl } from '../helpers/shop.adapter'
import type { ControlProductDto, ProductDto, ProductsQuery } from '../types/shop.api.types'
import type { Product } from '../types/shop.types'

const { PRODUCTS } = API_CONFIG.ENDPOINTS

// cuerpo de POST /products: solo lleva los filtros que realmente están aplicados
export const buildProductsBody = (ctx: RequestContext, query: ProductsQuery) => ({
    companyId: ctx.companyId,
    page: query.page,
    pageSize: query.pageSize,
    isActive: true,
    ...(query.warehouseId !== undefined && { warehouseId: query.warehouseId }),
    ...(query.brandId != null && { brandIds: [query.brandId] }),
    ...(query.categoryId != null && { categoryIds: [query.categoryId] }),
    ...(query.onlyInStock && { hasStock: true }),
})

// una página del catálogo: los productos ya convertidos y los metadatos de paginación
export const fetchProductsPage = async (ctx: RequestContext, query: ProductsQuery): Promise<Paginated<Product>> => {
    const { data } = await apiClient.post<APIResponse<ProductDto[] | null>>(PRODUCTS.LIST, buildProductsBody(ctx, query))
    const page = toPaginated(data)
    return { items: page.items.map((dto) => toProduct(dto, query.warehouseId)), meta: page.meta }
}

// búsqueda por texto en código, descripción, marca, modelo o categoría (sin paginación: devuelve hasta `limit` resultados)
export const searchProducts = async (
    ctx: RequestContext,
    text: string,
    limit: number,
    warehouseId?: number
): Promise<Product[]> => {
    const { data } = await apiClient.post<APIResponse<ControlProductDto[] | null>>(PRODUCTS.SEARCH, {
        companyId: ctx.companyId,
        limit,
        query: text,
        type: 'product', // el Swagger lo marca obligatorio (valores: product, user, category, brand, model, warehouse, cart); con 'product' la API real responde 200
    })
    return (data.data ?? []).map((dto) => toProductFromControl(dto, warehouseId))
}
