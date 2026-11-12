// shop.cart.api.types · lo que responde la API en Go en carritos (GET /carts/active y los cambios de renglones) y el estado del slice del carrito
// conecta con: shop.adapter (convierte CartDto a CartItem), shop.cart.service, shop.cart.thunks, shop.cart.slice y shop.selectors
// ojo: son los nombres del backend tal cual (CartResponse y CartItemResponse); la app solo usa CartItem (shop.types)
// ojo: el carrito es UNO por empleado (la API lo crea sola); los renglones se identifican por su id y por el stockId (producto + bodega + ubicación)
import type { LoadStatus } from '@/api'
import type { CartItem, Product } from './shop.types'

// un renglón del carrito: la API no trae marca, categoría ni imagen (solo código y nombre)
export interface CartItemDto {
    id: number // id del renglón
    cartId: number
    productId: number
    productCode: string
    productName: string
    stockId: number
    location?: string
    quantity: number
    unitPrice: number
    discount?: number
    lineTotal: number
}

export interface CartDto {
    id: number
    uuid: string
    customerId?: number | null
    warehouseId?: number | null
    priceTier?: string
    status?: string
    items?: CartItemDto[] | null
    subtotal?: number
    discountTotal?: number
    total?: number
    updatedAt?: string
}

// lo que hace falta para agregar un producto al carrito
export interface CartAddInput {
    cartId: number
    stockId?: number // la ubicación de la bodega de la que sale el producto (opcional si se pasa productId + warehouseId)
    productId?: number
    warehouseId?: number
    quantity: number
    price: number
}

// el carrito ya convertido: su id, su uuid y sus renglones
export interface CartSnapshot {
    cartId: number
    uuid: string
    items: CartItem[]
    version?: string
}

// estado del slice del carrito (no se guarda en el navegador: el carrito vive en el backend)
export interface CartState {
    cartId: number | null // el carrito activo del empleado; null hasta que se lee
    items: CartItem[]
    products: Record<string, Product> // productos agregados en esta sesión: la API no trae su marca ni imagen, se recuerdan aquí
    status: LoadStatus // de la lectura del carrito (GET /carts/active)
    error: string | null
    mutating: boolean // hay un cambio en curso (agregar, cambiar cantidad, quitar o vaciar); mientras tanto no se aceptan otros
    version?: string | null // última versión recibida del carrito (para applyVersioned)
}
