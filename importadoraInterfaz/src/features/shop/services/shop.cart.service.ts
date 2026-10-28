// shop.cart.service · llamadas al backend del carrito: POST /carts (leer), POST /carts/register (agregar), PUT /carts/update (cantidad), DELETE /carts/delete (quitar) y DELETE /carts/deleteall (vaciar) y PUT /carts/reassignuser (cambiar de cliente)
// conecta con: api/client y api/config, shop.adapter (toCartItem); las usa shop.cart.thunks
// ojo: el companyId y el usuario llegan en el contexto de petición; este service no lee el almacenamiento ni el store
// ojo: el vendedor es el usuario de la sesión; el cliente (userId) es el elegido en Terceros > Clientes, o el mismo usuario si no se eligió ninguno. typeCart es 'sale'
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toCartItem } from '../helpers/shop.adapter'
import type { CartAddInput, CartDto, CartQuery } from '../types/shop.cart.api.types'
import type { CartItem } from '../types/shop.types'

const { CARTS } = API_CONFIG.ENDPOINTS

const CART_TYPE_SALE = 'sale'

// el carrito de una venta: todas sus líneas
export const fetchCartItems = async (ctx: RequestContext, query: CartQuery): Promise<CartItem[]> => {
    const { data } = await apiClient.post<APIResponse<CartDto[] | null>>(CARTS.GET, {
        companyId: ctx.companyId,
        userId: query.customerId ?? ctx.userId,
        sellerId: ctx.userId,
        uuid: query.uuid,
        ...(query.warehouseId !== undefined && { warehouseId: query.warehouseId }),
    })
    return (data.data ?? []).map(toCartItem)
}

// agrega un producto (el backend descuenta ese stock de la bodega)
export const addCartItem = async (ctx: RequestContext, input: CartAddInput): Promise<void> => {
    const { customerId, ...line } = input
    await apiClient.post(CARTS.REGISTER_ITEM, {
        companyId: ctx.companyId,
        userId: customerId ?? ctx.userId,
        sellerId: ctx.userId,
        typeCart: CART_TYPE_SALE,
        discount: 0,
        ...line,
    })
}

// cambia la cantidad de una línea (el backend ajusta el stock)
export const updateCartItemQuantity = async (cartId: number, quantity: number): Promise<void> => {
    await apiClient.put(CARTS.UPDATE, { cartId, quantity })
}

// quita una línea (el backend devuelve su cantidad al stock disponible); DELETE con cuerpo: { cartId }
export const deleteCartItem = async (cartId: number): Promise<void> => {
    await apiClient.delete(CARTS.DELETE, { data: { cartId } })
}

// vacía todo el carrito de la venta (todas las líneas con ese uuid del usuario)
export const deleteCart = async (ctx: RequestContext, uuid: string, customerId?: number): Promise<void> => {
    await apiClient.delete(CARTS.DELETE_ALL, { data: { userId: customerId ?? ctx.userId, uuid } })
}

// pasa el carrito de un usuario a otro (cuando se elige o se cambia el cliente de la venta): PUT /carts/reassignuser
export const reassignCart = async (oldUserId: number, newUserId: number, uuid: string): Promise<void> => {
    await apiClient.put(CARTS.REASSIGN_USER, { oldUserId, newUserId, uuid })
}
