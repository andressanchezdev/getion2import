// shop.cart.api.types · lo que responde el backend en carritos (POST /carts) y el estado del slice del carrito
// conecta con: shop.adapter (convierte CartDto a CartItem), shop.cart.service, shop.cart.thunks, shop.cart.slice y shop.selectors
// ojo: son los nombres del backend tal cual (Swagger: models.CartResponse); la app solo usa CartItem (shop.types)
import type { LoadStatus } from '@/api'
import type { CartItem } from './shop.types'

export interface CartProductInfoDto {
    productId?: number
    code?: string
    description?: string
    brandName?: string
    brandImage?: string
    categoryName?: string
    modelName?: string
    url?: string
}

export interface CartDto {
    cartId: number
    productId: number
    quantity: number
    price: number
    discount?: number
    uuid?: string
    warehouseId?: number
    productInformation?: CartProductInfoDto | null
}

// lo que hace falta para pedir el carrito de una venta
export interface CartQuery {
    uuid: string
    warehouseId?: number
    customerId?: number // cliente de la venta; sin él se usa el usuario de la sesión
}

// lo que hace falta para agregar un producto al carrito
export interface CartAddInput {
    customerId?: number // cliente de la venta; sin él se usa el usuario de la sesión
    uuid: string
    warehouseId: number
    productId: number
    quantity: number
    price: number
}

// estado del slice del carrito (no se guarda en el navegador: el carrito vive en el backend)
export interface CartState {
    items: CartItem[]
    status: LoadStatus // de la lectura del carrito (POST /carts)
    error: string | null
    mutating: boolean // hay un cambio en curso (agregar, cambiar cantidad, quitar o vaciar); mientras tanto no se aceptan otros
}
