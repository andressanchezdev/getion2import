// shop.cart.service · llamadas al backend del carrito: GET /carts/active (leer), POST /carts (crear/alterno), POST /carts/:id/items (agregar), PUT y DELETE de un renglón y DELETE /carts/:id (vaciar)
// conecta con: api/client y api/config, shop.adapter (toCartSnapshot); las usa shop.cart.thunks
// ojo: la API crea sola el carrito del empleado y toma la compañía y el vendedor del token; este service no lee el almacenamiento ni el store
// ojo: el cliente de la venta ya no viaja en el carrito: se guarda en la app (shop.slice) y se manda al crear la venta
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toCartSnapshot } from '../helpers/shop.adapter'
import type { CartAddInput, CartDto, CartSnapshot } from '../types/shop.cart.api.types'
import type { Product } from '../types/shop.types'

const { CARTS } = API_CONFIG.ENDPOINTS

// el carrito activo del empleado con todas sus líneas
export const fetchActiveCart = async (known: Record<string, Product> = {}): Promise<CartSnapshot> => {
    const { data } = await apiClient.get<APIResponse<CartDto>>(CARTS.ACTIVE)
    return toCartSnapshot(data.data, known)
}

// agrega un producto desde una ubicación de la bodega (stockId); el precio es el del nivel elegido en la pantalla
export const addCartItem = async ({ cartId, stockId, quantity, price }: CartAddInput): Promise<void> => {
    await apiClient.post(CARTS.ITEMS(cartId), { stockId, quantity, unitPrice: price })
}

// cambia la cantidad de un renglón
export const updateCartItemQuantity = async (cartId: number, itemId: number, quantity: number): Promise<void> => {
    await apiClient.put(CARTS.ITEM(cartId, itemId), { quantity })
}

// quita un renglón
export const deleteCartItem = async (cartId: number, itemId: number): Promise<void> => {
    await apiClient.delete(CARTS.ITEM(cartId, itemId))
}

// vacía todo el carrito
export const clearCart = async (cartId: number): Promise<void> => {
    await apiClient.delete(CARTS.BY_ID(cartId))
}
