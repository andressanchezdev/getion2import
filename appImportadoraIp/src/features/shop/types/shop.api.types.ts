// shop.api.types · lo que responde el backend en productos (POST /products y POST /inventory/search) y los filtros que se le envían
// conecta con: shop.adapter (convierte estos tipos a Product), shop.products.service (los usa) y shop.products.slice
// ojo: son los nombres del backend tal cual (Swagger: models.ProductResponse, InventoryControlResponse); la app solo usa Product (shop.types)
import type { LoadStatus, PaginatorMetadata } from '@/api'
import type { Product } from './shop.types'

// ---- POST /products ----
export interface ProductImageDto {
    url: string
    isMain?: boolean
}

export interface ProductPriceDto {
    productPriceId?: number
    type: string // la API real manda 'sale'; el nivel P0..P3 se deduce por orden
    price: number
}

export interface ProductLocationDto {
    warehouseId: number
    locationCode?: string
    stock: number
    reservedStock?: number
}

export interface ProductDto {
    productId: number
    code: string
    description?: string
    brandName?: string
    categoryName?: string
    modelName?: string
    models?: string[]
    images?: ProductImageDto[] | null
    prices?: ProductPriceDto[] | null
    promotions?: ProductPriceDto[] | null
    locations?: ProductLocationDto[] | null
    isActive?: boolean
    isPromotion?: boolean
}

// ---- POST /inventory/search (búsqueda por texto) ----
export interface ControlLocationDto {
    warehouseId: number
    locationCode?: string
    physicalStock: number
}

export interface ControlProductDto {
    productId: number
    code: string
    productInformation?: {
        description?: string
        brandName?: string
        categoryName?: string
        modelName?: string
        productImage?: string
    }
    prices?: { price: number }[] | null
    locations?: ControlLocationDto[] | null
}

// ---- filtros que la pantalla pide al servicio ----
export interface ProductsQuery {
    page: number
    pageSize: number
    warehouseId?: number
    brandId?: number | null
    categoryId?: number | null
    onlyInStock?: boolean
}

// ---- estado del slice de productos (no se guarda en el navegador) ----
export type ProductsMode = 'list' | 'search'

export interface ProductsState {
    items: Product[]
    status: LoadStatus
    error: string | null
    meta: PaginatorMetadata | null // solo en modo "list"; la búsqueda por texto no trae paginación
    mode: ProductsMode
    page: number
    requestId: string | null // la última petición lanzada: una respuesta de otra anterior se descarta
}
