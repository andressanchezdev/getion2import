// shop.adapter · convierte los productos de la API en Go (ProductDto + filas de stock) al Product que usa la app
// conecta con: shop.products.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres de campos del backend en productos
import { getStorageUrl } from '@/global/helpers/storage/storageUrl'
import { LEGACY_PRODUCT_IMAGES } from '../constants/legacyProductImages'
import type { CartItem, Product, ProductPrices } from '../types/shop.types'
import type { CartDto, CartItemDto, CartSnapshot } from '../types/shop.cart.api.types'
import type { ProductApiPrices, ProductDto, ProductStock, StockRowDto } from '../types/shop.api.types'

const EMPTY_PRICES: ProductPrices = { p0: 0, p1: 0, p2: 0, p3: 0 }

// la API llama p1..p4 a lo que la app llama P0..P3
const API_PRICE_KEY: Record<keyof ProductPrices, keyof ProductApiPrices> = { p0: 'p1', p1: 'p2', p2: 'p3', p3: 'p4' }

// arma los 4 precios de la app a partir de { p1, p2, p3, p4 }; lo que falta queda en 0
export const toProductPrices = (prices: ProductApiPrices | null | undefined): ProductPrices => {
    const result = { ...EMPTY_PRICES }
    for (const level of Object.keys(API_PRICE_KEY) as (keyof ProductPrices)[]) {
        result[level] = Number(prices?.[API_PRICE_KEY[level]] ?? 0) || 0
    }
    return result
}

// suma lo vendible de cada producto en la bodega activa
export const indexStock = (rows: StockRowDto[], activeWarehouseId?: number): Map<number, ProductStock> => {
    const result = new Map<number, ProductStock>()
    const best = new Map<number, number>()
    const places = new Map<number, Array<{ code: string; sellable: number }>>()
    for (const row of rows) {
        if (activeWarehouseId !== undefined && row.warehouseId !== activeWarehouseId) continue
        const sellable = Math.max(0, row.sellable)
        const current = result.get(row.productId) ?? { sellable: 0 }
        current.sellable += sellable
        if (row.minStock && row.minStock > (current.minStock ?? 0)) current.minStock = row.minStock
        if (row.location) places.set(row.productId, [...(places.get(row.productId) ?? []), { code: row.location, sellable }])
        if (row.location && sellable >= (best.get(row.productId) ?? -1)) {
            current.location = row.location
            best.set(row.productId, sellable)
        }
        result.set(row.productId, current)
    }
    // un producto puede estar en varias ubicaciones de la bodega: se guardan todas, la de más vendible primero
    for (const [productId, list] of places) {
        const stock = result.get(productId)
        if (stock) stock.locations = list.sort((a, b) => b.sellable - a.sellable).map((place) => place.code)
    }
    return result
}

// limpia y valida que una URL sea una cadena no vacía
export const sanitizeImageUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : undefined
}

// el nombre del repuesto: su name; si falta se usa la descripción y, al final, el código
const nameOf = (dto: ProductDto): string => dto.name?.trim() || dto.description?.trim() || dto.code

// producto de GET /products o GET /products/search; stock (opcional) trae lo vendible y la ubicación en la bodega elegida
export const toProduct = (dto: ProductDto, warehouseId?: number, stock?: ProductStock): Product => {
    // la imagen de la API manda; si el producto no trae, se usa la que tenía en el bucket del sistema anterior (por código; la ruta se codifica porque lleva espacios y paréntesis)
    const legacy = LEGACY_PRODUCT_IMAGES[dto.code]
    const rawImage = sanitizeImageUrl(dto.images?.[0]) ?? (legacy ? encodeURI(legacy) : undefined)
    const isNew = Boolean(dto.isNew)

    return {
        id: String(dto.id),
        code: dto.code,
        name: nameOf(dto),
        description: dto.description || undefined,
        brand: dto.brandName ?? '',
        category: dto.categoryName ?? '',
        categoryId: dto.categoryId ? Number(dto.categoryId) : undefined,
        modelCompatible: dto.modelName || undefined,
        imageUrl: rawImage ? getStorageUrl(rawImage) : undefined,
        location: stock?.location,
        locations: stock?.locations,
        prices: toProductPrices(dto.prices),
        stockByWarehouse: stock?.byWarehouse ?? (warehouseId !== undefined && stock ? { [String(warehouseId)]: stock.sellable } : {}),
        minStockAlert: stock?.minStock,
        isNew,
        createdAt: dto.createdAt || undefined,
        status: (dto.status as Product['status']) ?? 'active',
        iva: dto.iva ?? 0,
    }
}

// renglón del carrito de la API → CartItem; known (opcional) es el producto completo si se agregó en esta sesión (la API solo trae código y nombre)
export const toCartItem = (dto: CartItemDto, known?: Product): CartItem => ({
    cartId: dto.id, // id del renglón: es con el que se cambia la cantidad o se quita
    stockId: dto.stockId,
    productId: String(dto.productId),
    product: known ?? {
        id: String(dto.productId),
        code: dto.productCode,
        name: dto.productName?.trim() || dto.productCode,
        brand: '',
        category: '',
        location: dto.location || undefined,
        prices: { ...EMPTY_PRICES },
        stockByWarehouse: {},
    },
    quantity: dto.quantity,
    selectedPrice: dto.unitPrice,
    priceLevel: null,
    subtotal: dto.lineTotal,
})

// carrito de GET /carts/active → su id, su uuid y sus renglones; known es el producto completo por id (si se conoce)
export const toCartSnapshot = (dto: CartDto, known: Record<string, Product> = {}): CartSnapshot => ({
    cartId: dto.id,
    uuid: dto.uuid,
    items: (dto.items ?? []).map((item) => toCartItem(item, known[String(item.productId)])),
})
