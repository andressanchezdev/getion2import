// shop.adapter · convierte los productos del backend (ProductDto y ControlProductDto) al Product que usa la app
// conecta con: shop.products.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres de campos del backend en productos
// ojo: SUPUESTOS a confirmar con datos reales: (1) prices[].type viene como 'P0'..'P3'; (2) el stock disponible de una bodega es stock - reservedStock;
// (3) en la búsqueda por texto los precios no traen tipo, se toman por orden (primero P0, luego P1, P2 y P3)
import { getStorageUrl } from '@/global/helpers/storageUrl'
import type { CartItem, PriceLevelKey, Product, ProductPrices } from '../types/shop.types'
import type { CartDto } from '../types/shop.cart.api.types'
import type { ControlProductDto, ProductDto, ProductImageDto, ProductPriceDto } from '../types/shop.api.types'

const LEVELS: PriceLevelKey[] = ['P0', 'P1', 'P2', 'P3']
const EMPTY_PRICES: ProductPrices = { p0: 0, p1: 0, p2: 0, p3: 0 }

// arma los 4 precios a partir de la lista con tipo; lo que falta queda en 0
const pricesByType = (rows: ProductPriceDto[] | null | undefined): ProductPrices => {
    const result = { ...EMPTY_PRICES }
    for (const row of rows ?? []) {
        const level = String(row.type).toUpperCase() as PriceLevelKey
        if (LEVELS.includes(level)) result[level.toLowerCase() as keyof ProductPrices] = row.price
    }
    return result
}

// en la búsqueda por texto los precios no traen tipo: se asignan en orden
const pricesByOrder = (rows: { price: number }[] | null | undefined): ProductPrices => {
    const result = { ...EMPTY_PRICES }
    ;(rows ?? []).slice(0, 4).forEach((row, index) => {
        result[LEVELS[index].toLowerCase() as keyof ProductPrices] = row.price
    })
    return result
}

// suma el stock de cada bodega (un producto puede tener varias ubicaciones en la misma bodega)
const stockByWarehouse = (rows: { warehouseId: number; available: number }[]): Record<string, number> => {
    const result: Record<string, number> = {}
    for (const row of rows) {
        const key = String(row.warehouseId)
        result[key] = (result[key] ?? 0) + Math.max(0, row.available)
    }
    return result
}

// limpia y valida que una URL sea una cadena no vacía
export const sanitizeImageUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : undefined
}

// extractor resiliente de la imagen del producto
// soporta: (1) images con objetos { url, isMain }, (2) images con strings, (3) campos planos productImage, image, photo
export const resolveProductImageUrl = (dto: ProductDto): string | undefined => {
    const images = dto.images
    if (Array.isArray(images) && images.length > 0) {
        let mainCandidate: ProductImageDto | string | undefined
        for (const item of images) {
            if (typeof item === 'object' && item !== null && Boolean(item.isMain)) {
                mainCandidate = item
                break
            }
        }
        const candidate = mainCandidate ?? images[0]
        if (typeof candidate === 'string') {
            const url = sanitizeImageUrl(candidate)
            if (url) return url
        } else if (candidate && typeof candidate === 'object') {
            const url = sanitizeImageUrl(candidate.url || candidate.imageUrl || candidate.path)
            if (url) return url
        }

        for (const item of images) {
            const url =
                typeof item === 'string'
                    ? sanitizeImageUrl(item)
                    : sanitizeImageUrl(item?.url || item?.imageUrl || item?.path)
            if (url) return url
        }
    }

    return sanitizeImageUrl(dto.productImage) || sanitizeImageUrl(dto.image) || sanitizeImageUrl(dto.photo)
}

// el nombre del repuesto es su descripción (el backend no tiene un campo "name"); si falta se usa el código
const nameOf = (description: string | undefined, code: string): string => description?.trim() || code

// productos de POST /products; warehouseId (opcional) elige de qué bodega se muestra la ubicación en estantería
export const toProduct = (dto: ProductDto, warehouseId?: number): Product => {
    const locations = dto.locations ?? []
    const location = locations.find((row) => row.warehouseId === warehouseId) ?? locations[0]
    const rawImage = resolveProductImageUrl(dto)
    const isNew = Boolean(
        dto.created_at && Date.now() - new Date(dto.created_at).getTime() <= 604800000
    )

    return {
        id: String(dto.productId),
        code: dto.code,
        name: nameOf(dto.description, dto.code),
        description: dto.description || undefined,
        brand: dto.brandName ?? '',
        brandImage: dto.brandImage ? getStorageUrl(dto.brandImage) : undefined,
        category: dto.categoryName ?? '',
        modelCompatible: dto.modelName || dto.models?.join(' / ') || undefined,
        imageUrl: rawImage ? getStorageUrl(rawImage) : undefined,
        location: location?.locationCode || undefined,
        prices: pricesByType(dto.prices),
        stockByWarehouse: stockByWarehouse(
            locations.map((row) => ({ warehouseId: row.warehouseId, available: row.stock - (row.reservedStock ?? 0) }))
        ),
        isNew,
        createdAt: dto.created_at || undefined,
    }
}

// productos de POST /inventory/search (búsqueda por texto)
export const toProductFromControl = (dto: ControlProductDto, warehouseId?: number): Product => {
    const info = dto.productInformation
    const locations = dto.locations ?? []
    const location = locations.find((row) => row.warehouseId === warehouseId) ?? locations[0]
    const rawProductImage = sanitizeImageUrl(info?.productImage) || sanitizeImageUrl((info as any)?.url)
    const rawBrandImage = sanitizeImageUrl(info?.brandImage)

    return {
        id: String(dto.productId),
        code: dto.code,
        name: nameOf(info?.description, dto.code),
        description: info?.description || undefined,
        brand: info?.brandName ?? '',
        brandImage: rawBrandImage ? getStorageUrl(rawBrandImage) : undefined,
        category: info?.categoryName ?? '',
        modelCompatible: info?.modelName || undefined,
        imageUrl: rawProductImage ? getStorageUrl(rawProductImage) : undefined,
        location: location?.locationCode || undefined,
        prices: pricesByOrder(dto.prices),
        stockByWarehouse: stockByWarehouse(locations.map((row) => ({ warehouseId: row.warehouseId, available: row.physicalStock }))),
    }
}

// línea del carrito (POST /carts) → CartItem; el producto se arma con productInformation (sin precios por nivel ni stock: eso solo lo trae el catálogo)
// ojo: el nivel de precio no viene del backend (priceLevel null); el subtotal es precio por cantidad (el campo discount no se aplica todavía)
export const toCartItem = (dto: CartDto): CartItem => {
    const info = dto.productInformation
    const code = info?.code ?? ''
    const rawProductImage = sanitizeImageUrl(info?.url) || sanitizeImageUrl((info as any)?.productImage)
    const rawBrandImage = sanitizeImageUrl(info?.brandImage)

    return {
        cartId: dto.cartId,
        productId: String(dto.productId),
        product: {
            id: String(dto.productId),
            code,
            name: nameOf(info?.description, code),
            brand: info?.brandName ?? '',
            brandImage: rawBrandImage ? getStorageUrl(rawBrandImage) : undefined,
            category: info?.categoryName ?? '',
            modelCompatible: info?.modelName || undefined,
            imageUrl: rawProductImage ? getStorageUrl(rawProductImage) : undefined,
            prices: { ...EMPTY_PRICES },
            stockByWarehouse: {},
        },
        quantity: dto.quantity,
        selectedPrice: dto.price,
        priceLevel: null,
        subtotal: dto.price * dto.quantity,
    }
}
