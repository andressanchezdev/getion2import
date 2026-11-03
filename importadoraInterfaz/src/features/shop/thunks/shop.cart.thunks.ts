// shop.cart.thunks · acciones del carrito contra el backend: leer y agregar (cambiar cantidad, quitar y vaciar están en shop.cart.update.thunks)
// conecta con: shop.cart.service y shop.stock.service (llamadas), auth (selectRequestContext), shop.slice (niveles y uuid), navigation (bodega activa), shop.products.thunks (recargar stock) y shop.cart.slice
// ojo: el backend es la fuente de verdad: después de cada cambio se vuelve a leer el carrito (no se suma a mano) y se recarga el catálogo porque el backend descuenta o devuelve stock
// ojo: solo se acepta un cambio a la vez (condition); así un doble clic no agrega dos veces. Los errores de un cambio se avisan con una alerta (toast)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { getPriceByLevel, toWarehouseNumber } from '../helpers/shop.helpers'
import { addCartItem, fetchActiveCart, updateCartItemQuantity } from '../services/shop.cart.service'
import { findStockId } from '../services/shop.stock.service'
import { loadProductsThunk } from './shop.products.thunks'
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

// agrega un producto: si ya está en el carrito suma a su renglón (mantiene su precio); si no, busca la ubicación de la bodega con stock y crea el renglón
export const addToCartThunk = createAsyncThunk<CartSnapshot, AddToCartInput, ThunkConfig>(
    'shop/cart/add',
    async ({ product, quantity, priceLevel }, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
        if (warehouseId === undefined) return rejectWithValue(failWith(null, NO_WAREHOUSE))

        try {
            const cartId = await resolveCartId(state)
            const existing = state.cart.items.find((item) => item.productId === product.id)
            if (existing) {
                await updateCartItemQuantity(cartId, existing.cartId, existing.quantity + quantity)
            } else {
                const stockId = await findStockId(ctx, warehouseId, Number(product.id), quantity)
                await addCartItem({ cartId, stockId, quantity, price: getPriceByLevel(product, priceLevel) })
            }
            const snapshot = await fetchActiveCart({ ...knownProducts(state), [product.id]: product })
            dispatch(loadProductsThunk()) // el backend descontó stock: se refresca el catálogo
            return snapshot
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo agregar el producto al carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
