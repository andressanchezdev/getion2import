// shop.api.types · lo que responde la API en Go en productos y stock (GET /products, GET /products/search y GET /stock) y los filtros que se le envían
// conecta con: shop.adapter (convierte estos tipos a Product), shop.products.service y shop.stock.service (los usan) y shop.products.slice
// ojo: son los nombres del backend tal cual (ProductResponse y WarehouseStockResponse); la app solo usa Product (shop.types)
import type { LoadStatus, PaginatorMetadata } from '@/api'

// ---- GET /products y GET /products/search ----
// precios por nivel: { p1, p2, p3, p4 }; la app los llama P0..P3 (p1 = P0, p2 = P1, p3 = P2, p4 = P3)
export type ProductApiPrices = Partial<Record<'p1' | 'p2' | 'p3' | 'p4', number>>

export interface ProductDto {
    id: number
    code: string
    name?: string
    description?: string | null
    brandId?: number | null
    brandName?: string | null
    categoryId?: number | null
    categoryName?: string | null
    modelId?: number | null
    modelName?: string | null
    images?: string[] | null // la primera es la principal
    prices?: ProductApiPrices | null
    isPromotion?: boolean
    isNew?: boolean
    status?: string // 'active' | 'inactive' | ...
    createdAt?: string
}

// ---- GET /stock: una fila por producto, bodega y ubicación ----
// ojo: lo vendible de la fila es sellable (físico menos lo reservado por pedidos); un producto puede tener varias filas en la misma bodega
export interface StockRowDto {
    stockId: number
    warehouseId: number
    warehouseName?: string
    productId: number
    location?: string | null
    available: number
    reserved: number
    sellable: number
    minStock?: number // alerta de stock bajo de esa existencia
}

// stock de un producto en la bodega elegida, ya sumado: lo que arma el adaptador a partir de las filas de GET /stock
export interface ProductStock {
    sellable: number
    minStock?: number // la alerta de stock bajo más alta de las ubicaciones de la bodega
    location?: string // la ubicación con más vendible
    locations?: string[] // todas las ubicaciones del producto en la bodega, la de más vendible primero
    byWarehouse?: Record<string, number>
}

// ---- filtros que la pantalla pide al servicio ----
export interface ProductsQuery {
    page: number
    pageSize: number
    warehouseId?: number
    brandId?: number | null
    categoryId?: number | null
    onlyInStock?: boolean
    includeInactive?: boolean // la tienda solo vende productos activos; la administración de inventario necesita ver también los inactivos
}

// ---- estado del slice de productos (no se guarda en el navegador) ----
export type ProductsMode = 'list' | 'search'

export interface ProductsState {
    items: import('./shop.types').Product[]
    meta: PaginatorMetadata | null
    status: LoadStatus
    error: string | null
    mode: ProductsMode
    requestId: string | null
    page: number
    summary?: { shown: number; total: number }
}
