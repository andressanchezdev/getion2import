// shop.cart.thunks · acciones del carrito contra el backend: leer y agregar (cambiar cantidad, quitar y vaciar están en shop.cart.update.thunks)
// conecta con: shop.cart.service (llamadas), auth (selectRequestContext), shop.slice (niveles y uuid), navigation (bodega activa) y shop.cart.slice
// ojo: el servidor resuelve el stockId a partir de productId + warehouseId y responde el carrito actualizado en una sola petición (sin recargar el catálogo)
// ojo: solo se acepta un cambio a la vez (condition); así un doble clic no agrega dos veces. Los errores de un cambio se avisan con una alerta (toast)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { getPriceByLevel, toWarehouseNumber } from '../helpers/shop.helpers'
import { addCartItem, fetchActiveCart, updateCartItemQuantity } from '../services/shop.cart.service'
import type { CartSnapshot, CartState } from '../types/shop.cart.api.types'
import type { ProductsState } from '../types/shop.api.types'
import type { PriceLevelKey, Product, ShopState } from '../types/shop.types'

export type ThunkState = { auth: AuthState; shop: ShopState; ui: NavigationState; cart: CartState; products: ProductsState }
export type ThunkConfig = { state: ThunkState; rejectValue: string }

export const NO_SESSION = 'No hay una sesión activa.'
const NO_WAREHOUSE = 'Elige una bodega antes de modificar el carrito.'

// avisa el error al usuario y lo devuelve como rechazo del thunk
export const failWith = (error: unknown, fallback: string) => {
    const message = getErrorMessage(error, fallback)
    toast.error(message)
    return message
}

// solo un cambio a la vez
export const noOtherChangeRunning = (_: unknown, { getState }: { getState: () => ThunkState }) => !getState().cart.mutating

// productos completos que ya se conocen (por id): los agregados en esta sesión y los del catálogo que se está viendo
// ojo: la API del carrito solo trae código y nombre; con esto el carrito conserva marca, categoría e imagen
export const knownProducts = (state: ThunkState): Record<string, Product> => {
    const known: Record<string, Product> = { ...state.cart.products }
    for (const product of state.products.items) known[product.id] = product
    return known
}

// aplica los productos completos conocidos sobre un CartSnapshot devuelto por la API
export const enrichCartSnapshot = (snapshot: CartSnapshot, known: Record<string, Product>): CartSnapshot => ({
    ...snapshot,
    items: snapshot.items.map((item) => {
        const knownProd = known[item.productId]
        return knownProd ? { ...item, product: knownProd } : item
    }),
})

// el id del carrito activo (el que ya se leyó); si todavía no se leyó se pide
export const resolveCartId = async (state: ThunkState): Promise<number> => state.cart.cartId ?? (await fetchActiveCart()).cartId

// lee el carrito activo del backend (si no existe, la API lo crea)
export const fetchCartThunk = createAsyncThunk<CartSnapshot, void, ThunkConfig>(
    'shop/cart/fetch',
    async (_, { getState, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            return await fetchActiveCart(knownProducts(state))
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el carrito.'))
        }
    },
    { condition: (_, { getState }) => getState().cart.status !== 'loading' }
)

export interface AddToCartInput {
    product: Product
    quantity: number
    priceLevel: PriceLevelKey
}

// agrega un producto: si ya está en el carrito suma a su renglón (mantiene su precio); si no, el servidor resuelve el stock por productId + warehouseId
export const addToCartThunk = createAsyncThunk<CartSnapshot, AddToCartInput, ThunkConfig>(
    'shop/cart/add',
    async ({ product, quantity, priceLevel }, { getState, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
        if (warehouseId === undefined) return rejectWithValue(failWith(null, NO_WAREHOUSE))

        try {
            const cartId = await resolveCartId(state)
            const known = { ...knownProducts(state), [product.id]: product }
            const existing = state.cart.items.find((item) => item.productId === product.id)
            const direct = existing
                ? await updateCartItemQuantity(cartId, existing.cartId, existing.quantity + quantity)
                : await addCartItem({
                      cartId,
                      productId: Number(product.id),
                      warehouseId,
                      quantity,
                      price: getPriceByLevel(product, priceLevel),
                  })
            const snapshot = direct ? enrichCartSnapshot(direct, known) : await fetchActiveCart(known)
            return snapshot
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo agregar el producto al carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
