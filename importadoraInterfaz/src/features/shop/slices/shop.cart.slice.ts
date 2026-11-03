// shop.cart.slice · carrito que viene del backend: líneas, estado de lectura y bandera de "hay un cambio en curso"
// conecta con: shop.cart.thunks (lo llenan), shop.selectors (lecturas: líneas, cantidades, totales) y rootReducer (clave 'cart'; NO se guarda en el navegador)
// ojo: antes el carrito era local y se guardaba en shop.slice; ahora el backend manda y aquí solo se refleja lo que devuelve (GET /carts/active)
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { addToCartThunk, fetchCartThunk } from '../thunks/shop.cart.thunks'
import { clearCartThunk, removeCartItemThunk, updateCartQuantityThunk } from '../thunks/shop.cart.update.thunks'
import { setCartCustomerThunk } from '../thunks/shop.cart.customer.thunks'
import type { CartSnapshot, CartState } from '../types/shop.cart.api.types'

export const INITIAL_CART_STATE: CartState = {
    cartId: null,
    items: [],
    products: {},
    status: 'idle',
    error: null,
    mutating: false,
}

// el carrito leído del backend: su id y sus renglones
const applySnapshot = (state: CartState, snapshot: CartSnapshot): void => {
    state.cartId = snapshot.cartId
    state.items = snapshot.items
    state.status = 'succeeded'
}

const mutations = [addToCartThunk, updateCartQuantityThunk, removeCartItemThunk, clearCartThunk, setCartCustomerThunk] as const

export const cartSlice = createSlice({
    name: 'cart',
    initialState: INITIAL_CART_STATE,
    reducers: {
        // al cerrar sesión se olvida el carrito de ese usuario
        resetCart: () => INITIAL_CART_STATE,
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

export const { resetCart } = cartSlice.actions
export const cartReducer = cartSlice.reducer
export default cartSlice.reducer
