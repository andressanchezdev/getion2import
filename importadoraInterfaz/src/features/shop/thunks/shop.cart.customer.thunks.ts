// shop.cart.customer.thunks · elegir (o quitar) el cliente de la venta
// conecta con: shop.cart.thunks (avisos, tipos y regla de un cambio a la vez), shop.slice (guarda el cliente) y shop.cart.slice (lo trata como un cambio más)
// ojo: antes el cliente se le asignaba al carrito en el backend (PUT /carts/reassignuser); la API en Go no tiene esa ruta: el cliente se guarda en la app
// (shop.slice.cartCustomer) y viaja al crear la venta (customerId). Por eso este thunk ya no llama al servidor y los renglones del carrito no cambian
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { NO_SESSION, noOtherChangeRunning, type ThunkConfig } from './shop.cart.thunks'
import type { CartCustomer, CartItem } from '../types/shop.types'

export interface CartCustomerResult {
    customer: CartCustomer | null
    items: CartItem[]
}

export const setCartCustomerThunk = createAsyncThunk<CartCustomerResult, CartCustomer | null, ThunkConfig>(
    'shop/cart/setCustomer',
    async (customer, { getState, rejectWithValue }) => {
        const state = getState()
        if (!selectRequestContext(state)) return rejectWithValue(NO_SESSION)
        return { customer, items: state.cart.items }
    },
    { condition: noOtherChangeRunning }
)
