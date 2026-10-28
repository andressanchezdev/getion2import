// shop.cart.customer.thunks · elegir (o quitar) el cliente de la venta y pasarle el carrito que ya existía
// conecta con: shop.cart.service (reassignCart y lectura), shop.cart.thunks (avisos, tipos y regla de un cambio a la vez), shop.slice (guarda el cliente) y shop.cart.slice (reacciona); la despacha el panel del cliente (features/customers) y el carrito
// ojo: si ya hay un carrito (uuid) y el cliente cambia, el backend lo reasigna con PUT /carts/reassignuser; sin carrito solo se guarda la elección. Quitar el cliente devuelve la venta al usuario de la sesión
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { toWarehouseNumber } from '../helpers/shop.helpers'
import { fetchCartItems, reassignCart } from '../services/shop.cart.service'
import { failWith, NO_SESSION, noOtherChangeRunning, type ThunkConfig } from './shop.cart.thunks'
import type { CartCustomer, CartItem } from '../types/shop.types'

export interface CartCustomerResult {
    customer: CartCustomer | null
    items: CartItem[]
}

export const setCartCustomerThunk = createAsyncThunk<CartCustomerResult, CartCustomer | null, ThunkConfig>(
    'shop/cart/setCustomer',
    async (customer, { getState, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)

        const uuid = state.shop.cartUuid
        if (!uuid) return { customer, items: [] } // todavía no hay carrito: solo se recuerda el cliente

        const previousUserId = state.shop.cartCustomer?.id ?? ctx.userId
        const nextUserId = customer?.id ?? ctx.userId
        try {
            if (previousUserId !== nextUserId) await reassignCart(previousUserId, nextUserId, uuid)
            const items = await fetchCartItems(ctx, {
                uuid,
                warehouseId: toWarehouseNumber(state.ui.activeWarehouseId),
                customerId: customer?.id,
            })
            return { customer, items }
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo cambiar el cliente de la venta.'))
        }
    },
    { condition: noOtherChangeRunning }
)
