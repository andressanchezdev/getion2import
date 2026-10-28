// shop.cart.thunks · acciones del carrito contra el backend: leer y agregar (cambiar cantidad, quitar y vaciar están en shop.cart.update.thunks)
// conecta con: shop.cart.service (llamadas), auth (selectRequestContext), shop.slice (uuid y niveles), navigation (bodega activa), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona)
// ojo: el backend es la fuente de verdad: después de cada cambio se vuelve a leer el carrito (no se suma a mano) y se recarga el catálogo porque el backend descuenta o devuelve stock
// ojo: solo se acepta un cambio a la vez (condition); así un doble clic no agrega dos veces. Los errores de un cambio se avisan con una alerta (toast)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/toast'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { createCartUuid, getPriceByLevel, toWarehouseNumber } from '../helpers/shop.helpers'
import { addCartItem, fetchCartItems, updateCartItemQuantity } from '../services/shop.cart.service'
import { loadProductsThunk } from './shop.products.thunks'
import type { CartState } from '../types/shop.cart.api.types'
import type { ProductsState } from '../types/shop.api.types'
import type { CartItem, PriceLevelKey, Product, ShopState } from '../types/shop.types'

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

// lee el carrito del backend (si todavía no hay uuid, el carrito está vacío y no se llama)
export const fetchCartThunk = createAsyncThunk<CartItem[], void, ThunkConfig>(
    'shop/cart/fetch',
    async (_, { getState, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        if (!state.shop.cartUuid) return []
        try {
            return await fetchCartItems(ctx, {
                uuid: state.shop.cartUuid,
                warehouseId: toWarehouseNumber(state.ui.activeWarehouseId),
                customerId: state.shop.cartCustomer?.id,
            })
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

// agrega un producto: si ya está en el carrito suma a su línea (mantiene su precio); si no, crea la línea. El primer producto crea el uuid del carrito
export const addToCartThunk = createAsyncThunk<{ items: CartItem[]; uuid: string }, AddToCartInput, ThunkConfig>(
    'shop/cart/add',
    async ({ product, quantity, priceLevel }, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
        if (warehouseId === undefined) return rejectWithValue(failWith(null, NO_WAREHOUSE))

        const uuid = state.shop.cartUuid || createCartUuid()
        const customerId = state.shop.cartCustomer?.id
        try {
            const existing = state.cart.items.find((item) => item.productId === product.id)
            if (existing) {
                await updateCartItemQuantity(existing.cartId, existing.quantity + quantity)
            } else {
                await addCartItem(ctx, {
                    customerId,
                    uuid,
                    warehouseId,
                    productId: Number(product.id),
                    quantity,
                    price: getPriceByLevel(product, priceLevel),
                })
            }
            const items = await fetchCartItems(ctx, { uuid, warehouseId, customerId })
            dispatch(loadProductsThunk()) // el backend descontó stock: se refresca el catálogo
            return { items, uuid }
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo agregar el producto al carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
