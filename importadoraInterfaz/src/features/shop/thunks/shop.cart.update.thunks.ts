// shop.cart.update.thunks · cambios sobre lo que ya está en el carrito: cambiar cantidad, quitar un renglón y vaciar todo
// conecta con: shop.cart.service (llamadas), shop.cart.thunks (avisos, tipos, productos conocidos y la regla de un cambio a la vez) y shop.cart.slice (reacciona)
// ojo: cada mutación devuelve el carrito actualizado directamente (sin recargar el catálogo; el stock solo cambia al crear el pedido)
// ojo: el "cartId" que reciben los thunks es el id del RENGLÓN (CartItem.cartId); el id del carrito sale del estado (cart.cartId)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { clearCart, deleteCartItem, fetchActiveCart, updateCartItemQuantity } from '../services/shop.cart.service'
import { enrichCartSnapshot, failWith, knownProducts, NO_SESSION, noOtherChangeRunning, resolveCartId, type ThunkConfig } from './shop.cart.thunks'
import type { CartSnapshot } from '../types/shop.cart.api.types'

// cambia la cantidad de un renglón; con 0 o menos lo quita
export const updateCartQuantityThunk = createAsyncThunk<CartSnapshot, { cartId: number; quantity: number }, ThunkConfig>(
    'shop/cart/update',
    async ({ cartId: itemId, quantity }, { getState, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            const cartId = await resolveCartId(state)
            const known = knownProducts(state)
            const direct = quantity <= 0
                ? await deleteCartItem(cartId, itemId)
                : await updateCartItemQuantity(cartId, itemId, quantity)
            return direct ? enrichCartSnapshot(direct, known) : await fetchActiveCart(known)
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo cambiar la cantidad.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// quita un renglón del carrito
export const removeCartItemThunk = createAsyncThunk<CartSnapshot, number, ThunkConfig>(
    'shop/cart/remove',
    async (itemId, { getState, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            const known = knownProducts(state)
            const direct = await deleteCartItem(await resolveCartId(state), itemId)
            return direct ? enrichCartSnapshot(direct, known) : await fetchActiveCart(known)
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo quitar el producto.'))
        }
    },
    { condition: noOtherChangeRunning }
)

// vacía todo el carrito de la venta
export const clearCartThunk = createAsyncThunk<CartSnapshot, void, ThunkConfig>(
    'shop/cart/clear',
    async (_, { getState, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        try {
            const cartId = await resolveCartId(state)
            await clearCart(cartId)
            return { cartId, uuid: state.shop.cartUuid, items: [] }
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo vaciar el carrito.'))
        }
    },
    { condition: noOtherChangeRunning }
)
