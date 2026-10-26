// shop.cart.update.thunks · cambios sobre lo que ya está en el carrito: cambiar cantidad, quitar una línea y vaciar todo
// conecta con: shop.cart.service (llamadas), shop.cart.thunks (avisos, tipos y la regla de un cambio a la vez), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona)
// ojo: igual que agregar, después de cada cambio se vuelve a leer el carrito y se recarga el catálogo (el backend descuenta o devuelve stock)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { toWarehouseNumber } from '../helpers/shop.helpers'
import { deleteCart, deleteCartItem, fetchCartItems, updateCartItemQuantity } from '../services/shop.cart.service'
import { failWith, NO_SESSION, noOtherChangeRunning, type ThunkConfig } from './shop.cart.thunks'
import { loadProductsThunk } from './shop.products.thunks'
import type { CartItem } from '../types/shop.types'

// cambia la cantidad de una línea; con 0 o menos la quita
export const updateCartQuantityThunk = createAsyncThunk<CartItem[], { cartId: number; quantity: number }, ThunkConfig>(
    'shop/cart/update',
    async ({ cartId, quantity }, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        try {
            if (quantity <= 0) await deleteCartItem(cartId)
            else await updateCartItemQuantity(cartId, quantity)
            const items = await fetchCartItems(ctx, {
                uuid: state.shop.cartUuid,
                warehouseId: toWarehouseNumber(state.ui.activeWarehouseId),
                customerId: state.shop.cartCustomer?.id,
            })
            dispatch(loadProductsThunk())
            return items
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo cambiar la cantidad.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// quita una línea del carrito (el backend devuelve su cantidad al stock)
export const removeCartItemThunk = createAsyncThunk<CartItem[], number, ThunkConfig>(
    'shop/cart/remove',
    async (cartId, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        try {
            await deleteCartItem(cartId)
            const items = await fetchCartItems(ctx, {
                uuid: state.shop.cartUuid,
                warehouseId: toWarehouseNumber(state.ui.activeWarehouseId),
                customerId: state.shop.cartCustomer?.id,
            })
            dispatch(loadProductsThunk())
            return items
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo quitar el producto.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// vacía todo el carrito de la venta
export const clearCartThunk = createAsyncThunk<CartItem[], void, ThunkConfig>(
    'shop/cart/clear',
    async (_, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        try {
            if (state.shop.cartUuid) await deleteCart(ctx, state.shop.cartUuid, state.shop.cartCustomer?.id)
            dispatch(loadProductsThunk())
            return []
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo vaciar el carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
