// shop.cart.update.thunks · cambios sobre lo que ya está en el carrito: cambiar cantidad, quitar un renglón y vaciar todo
// conecta con: shop.cart.service (llamadas), shop.cart.thunks (avisos, tipos, productos conocidos y la regla de un cambio a la vez), shop.products.thunks (recargar stock) y shop.cart.slice (reacciona)
// ojo: igual que agregar, después de cada cambio se vuelve a leer el carrito y se recarga el catálogo (el backend descuenta o devuelve stock)
// ojo: el "cartId" que reciben los thunks es el id del RENGLÓN (CartItem.cartId); el id del carrito sale del estado (cart.cartId)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { clearCart, deleteCartItem, fetchActiveCart, updateCartItemQuantity } from '../services/shop.cart.service'
import { failWith, knownProducts, NO_SESSION, noOtherChangeRunning, resolveCartId, type ThunkConfig } from './shop.cart.thunks'
import { loadProductsThunk } from './shop.products.thunks'
import type { CartSnapshot } from '../types/shop.cart.api.types'

// cambia la cantidad de un renglón; con 0 o menos lo quita
export const updateCartQuantityThunk = createAsyncThunk<CartSnapshot, { cartId: number; quantity: number }, ThunkConfig>(
    'shop/cart/update',
    async ({ cartId: itemId, quantity }, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            const cartId = await resolveCartId(state)
            if (quantity <= 0) await deleteCartItem(cartId, itemId)
            else await updateCartItemQuantity(cartId, itemId, quantity)
            const snapshot = await fetchActiveCart(knownProducts(state))
            dispatch(loadProductsThunk())
            return snapshot
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo cambiar la cantidad.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// quita un renglón del carrito (el backend devuelve su cantidad al stock)
export const removeCartItemThunk = createAsyncThunk<CartSnapshot, number, ThunkConfig>(
    'shop/cart/remove',
    async (itemId, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            await deleteCartItem(await resolveCartId(state), itemId)
            const snapshot = await fetchActiveCart(knownProducts(state))
            dispatch(loadProductsThunk())
            return snapshot
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo quitar el producto.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// vacía todo el carrito de la venta
export const clearCartThunk = createAsyncThunk<CartSnapshot, void, ThunkConfig>(
    'shop/cart/clear',
    async (_, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            const cartId = await resolveCartId(state)
            await clearCart(cartId)
            const snapshot = await fetchActiveCart()
            dispatch(loadProductsThunk())
            return snapshot
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo vaciar el carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
