// shop.adapter · convierte los productos del backend (ProductDto y ControlProductDto) al Product que usa la app
// conecta con: shop.products.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres de campos del backend en productos
// ojo: SUPUESTOS a confirmar con datos reales: (1) prices[].type puede venir como 'P0'..'P3', pero con la API real llega 'sale' en todos: entonces los niveles se toman por orden del precio (el mayor es P0); (2) el stock disponible de una bodega es stock - reservedStock;
// (3) en la búsqueda por texto los precios no traen tipo, se toman por orden (primero P0, luego P1, P2 y P3)
import type { CartItem, PriceLevelKey, Product, ProductPrices } from '../types/shop.types'
import type { CartDto } from '../types/shop.cart.api.types'
import type { ControlProductDto, ProductDto, ProductPriceDto } from '../types/shop.api.types'

const LEVELS: PriceLevelKey[] = ['P0', 'P1', 'P2', 'P3']
const EMPTY_PRICES: ProductPrices = { p0: 0, p1: 0, p2: 0, p3: 0 }

// en la búsqueda por texto los precios no traen tipo: se asignan en orden
const pricesByOrder = (rows: { price: number }[] | null | undefined): ProductPrices => {
    const result = { ...EMPTY_PRICES }
    ;(rows ?? []).slice(0, 4).forEach((row, index) => {
        result[LEVELS[index].toLowerCase() as keyof ProductPrices] = row.price
    })
    return result
}

// arma los 4 precios a partir de la lista con tipo; lo que falta queda en 0
// ojo: la API real manda type "sale" en todas las filas (no P0..P3): si ninguna fila trae un nivel válido se usa el orden por productPriceId
const pricesByType = (rows: ProductPriceDto[] | null | undefined): ProductPrices => {
    const result = { ...EMPTY_PRICES }
    let matched = 0
    for (const row of rows ?? []) {
        const level = String(row.type).toUpperCase() as PriceLevelKey
        if (LEVELS.includes(level)) {
            result[level.toLowerCase() as keyof ProductPrices] = row.price
            matched += 1
        }
    }
    if (matched > 0) return result
    const ordered = [...(rows ?? [])].sort((a, b) => (a.productPriceId ?? 0) - (b.productPriceId ?? 0))
    return pricesByOrder(ordered)
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

// el nombre del repuesto es su descripción (el backend no tiene un campo "name"); si falta se usa el código
const nameOf = (description: string | undefined, code: string): string => description?.trim() || code

// productos de POST /products; warehouseId (opcional) elige de qué bodega se muestra la ubicación en estantería
export const toProduct = (dto: ProductDto, warehouseId?: number): Product => {
    const locations = dto.locations ?? []
    const location = locations.find((row) => row.warehouseId === warehouseId) ?? locations[0]
    const images = dto.images ?? []
    const image = images.find((row) => row.isMain) ?? images[0]
    return {
        id: String(dto.productId),
        code: dto.code,
        name: nameOf(dto.description, dto.code),
        description: dto.description || undefined,
        brand: dto.brandName ?? '',
        category: dto.categoryName ?? '',
        modelCompatible: dto.modelName || dto.models?.join(' / ') || undefined,
        imageUrl: image?.url || undefined,
        location: location?.locationCode || undefined,
        prices: pricesByType(dto.prices),
        stockByWarehouse: stockByWarehouse(
            locations.map((row) => ({ warehouseId: row.warehouseId, available: row.stock - (row.reservedStock ?? 0) }))
        ),
    }
}

// productos de POST /inventory/search (búsqueda por texto)
export const toProductFromControl = (dto: ControlProductDto, warehouseId?: number): Product => {
    const info = dto.productInformation
    const locations = dto.locations ?? []
    const location = locations.find((row) => row.warehouseId === warehouseId) ?? locations[0]
    return {
        id: String(dto.productId),
        code: dto.code,
        name: nameOf(info?.description, dto.code),
        description: info?.description || undefined,
        brand: info?.brandName ?? '',
        category: info?.categoryName ?? '',
        modelCompatible: info?.modelName || undefined,
        imageUrl: info?.productImage || undefined,
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
    return {
        cartId: dto.cartId,
        productId: String(dto.productId),
        product: {
            id: String(dto.productId),
            code,
            name: nameOf(info?.description, code),
            brand: info?.brandName ?? '',
            category: info?.categoryName ?? '',
            modelCompatible: info?.modelName || undefined,
            imageUrl: info?.url || undefined,
            prices: { ...EMPTY_PRICES },
            stockByWarehouse: {},
        },
        quantity: dto.quantity,
        selectedPrice: dto.price,
        priceLevel: null,
        subtotal: dto.price * dto.quantity,
    }
}
