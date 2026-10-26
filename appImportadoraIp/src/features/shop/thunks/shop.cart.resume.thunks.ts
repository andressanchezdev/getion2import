// shop.cart.resume.thunks · retomar un carrito guardado (pedidos pendientes): lee sus líneas del backend y SOLO entonces cambia el uuid y el cliente de la venta
// conecta con: shop.cart.service (lectura), shop.cart.thunks (avisos y regla de un cambio a la vez), shop.slice (uuid y cliente) y shop.cart.slice (líneas); la despacha PendingCartsScreen
// ojo: si la lectura falla no cambia nada (el carrito actual sigue completo y coherente con su uuid); así el total que se factura siempre sale de las líneas de ese uuid
import { createAsyncThunk } from '@reduxjs/toolkit'
import { selectRequestContext } from '@/features/auth'
import { toWarehouseNumber } from '../helpers/shop.helpers'
import { fetchCartItems } from '../services/shop.cart.service'
import { failWith, NO_SESSION, noOtherChangeRunning, type ThunkConfig } from './shop.cart.thunks'
import type { CartCustomer, CartItem } from '../types/shop.types'

export interface ResumeCartInput {
    uuid: string
    customer: CartCustomer | null
}

export interface ResumeCartResult extends ResumeCartInput {
    items: CartItem[]
}

export const resumeCartThunk = createAsyncThunk<ResumeCartResult, ResumeCartInput, ThunkConfig>(
    'shop/cart/resume',
    async ({ uuid, customer }, { getState, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue(NO_SESSION)
        try {
            const items = await fetchCartItems(ctx, { uuid, warehouseId: toWarehouseNumber(state.ui.activeWarehouseId), customerId: customer?.id })
            return { uuid, customer, items }
        } catch (error) {
            return rejectWithValue(failWith(error, 'No se pudo retomar el pedido pendiente.'))
        }
    },
    { condition: noOtherChangeRunning }
)
