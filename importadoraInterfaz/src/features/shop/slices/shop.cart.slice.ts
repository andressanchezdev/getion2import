// shop.cart.slice · carrito que viene del backend: líneas, estado de lectura y bandera de "hay un cambio en curso"
// conecta con: shop.cart.thunks (lo llenan), shop.selectors (lecturas: líneas, cantidades, totales) y rootReducer (clave 'cart'; NO se guarda en el navegador)
// ojo: antes el carrito era local y se guardaba en shop.slice; ahora el backend manda y aquí solo se refleja lo que devuelve (GET /carts/active)
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { isNewer } from '@/global/helpers/realtime/applyVersioned'
import { toCartSnapshot } from '../helpers/shop.adapter'
import { addToCartThunk, fetchCartThunk } from '../thunks/shop.cart.thunks'
import { clearCartThunk, removeCartItemThunk, updateCartQuantityThunk } from '../thunks/shop.cart.update.thunks'
import { setCartCustomerThunk } from '../thunks/shop.cart.customer.thunks'
import type { CartDto, CartSnapshot, CartState } from '../types/shop.cart.api.types'
import type { Product } from '../types/shop.types'

export const INITIAL_CART_STATE: CartState = {
    cartId: null,
    items: [],
    products: {},
    status: 'idle',
    error: null,
    mutating: false,
    version: null,
}

// el carrito leído del backend: su id y sus renglones
const applySnapshot = (state: CartState, snapshot: CartSnapshot): void => {
    state.cartId = snapshot.cartId
    state.items = snapshot.items
    state.status = 'succeeded'
    if (snapshot.version) state.version = snapshot.version
}

const mutations = [addToCartThunk, updateCartQuantityThunk, removeCartItemThunk, clearCartThunk, setCartCustomerThunk] as const

export const cartSlice = createSlice({
    name: 'cart',
    initialState: INITIAL_CART_STATE,
    reducers: {
        // al cerrar sesión se olvida el carrito de ese usuario
        resetCart: () => INITIAL_CART_STATE,
        // tiempo real: sincroniza el carrito entre pestañas del mismo actor (cart.updated)
        cartUpdatedFromEvent: (state, action: PayloadAction<{ cart: CartDto | null; version: string }>) => {
            const { cart, version } = action.payload
            if (!isNewer(version, state.version)) return
            state.version = version
            if (!cart) {
                state.items = []
                return
            }
            applySnapshot(state, toCartSnapshot(cart, state.products, version))
        },
        // tiempo real: actualiza el tope vendible (maxAvailable) de los renglones afectados por stock.changed
        cartStockChangedFromEvent: (
            state,
            action: PayloadAction<Array<{ stockId: number; productId: number; sellable: number }>>
        ) => {
            for (const row of action.payload) {
                for (const item of state.items) {
                    if (item.stockId === row.stockId || (!item.stockId && Number(item.productId) === row.productId)) {
                        item.maxAvailable = Math.max(0, row.sellable)
                    }
                }
            }
        },
        // tiempo real: marca o desmarca como no disponible el renglón cuyo producto cambia de estado
        cartProductStatusFromEvent: (
            state,
            action: PayloadAction<{ productId: string; status: string }>
        ) => {
            const { productId, status } = action.payload
            const unavailable = status !== 'active'
            for (const item of state.items) {
                if (item.productId === productId) {
                    item.unavailable = unavailable
                    item.product.status = status as Product['status']
                }
            }
            if (state.products[productId]) {
                state.products[productId].status = status as Product['status']
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // lectura
            .addCase(fetchCartThunk.pending, (state) => {
                state.status = 'loading'
                state.error = null
            })
            .addCase(fetchCartThunk.fulfilled, (state, action: PayloadAction<CartSnapshot>) => applySnapshot(state, action.payload))
            .addCase(fetchCartThunk.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.payload ?? 'No se pudo cargar el carrito.'
            })
            // cambios: mientras uno corre, la bandera impide otros
            .addCase(addToCartThunk.fulfilled, (state, action) => {
                applySnapshot(state, action.payload)
                state.products[action.meta.arg.product.id] = action.meta.arg.product // la API no trae marca ni imagen: se recuerda el producto agregado
            })
            .addCase(updateCartQuantityThunk.fulfilled, (state, action) => applySnapshot(state, action.payload))
            .addCase(removeCartItemThunk.fulfilled, (state, action) => applySnapshot(state, action.payload))
            .addCase(clearCartThunk.fulfilled, (state, action) => {
                applySnapshot(state, action.payload)
                state.products = {}
            })
            .addCase(setCartCustomerThunk.fulfilled, (state, action) => {
                state.items = action.payload.items
                state.status = 'succeeded'
            })
            .addMatcher(isAnyOf(...mutations.map((thunk) => thunk.pending)), (state) => {
                state.mutating = true
            })
            .addMatcher(
                isAnyOf(...mutations.map((thunk) => thunk.fulfilled), ...mutations.map((thunk) => thunk.rejected)),
                (state) => {
                    state.mutating = false
                }
            )
    },
})

export const {
    resetCart,
    cartUpdatedFromEvent,
    cartStockChangedFromEvent,
    cartProductStatusFromEvent,
} = cartSlice.actions
export const cartReducer = cartSlice.reducer
export default cartSlice.reducer
