// shop.checkout.thunks · cierra la venta: convierte el carrito del backend en un pedido (POST /sales/register)
// conecta con: shop.sales.service (llamada), shop.cart.thunks (avisos y regla de un cambio a la vez), shop.products.thunks (recargar stock), shop.slice y shop.cart.slice (olvidan el carrito al terminar)
// ojo: el crédito exige cliente. Si el backend rechaza la venta el carrito se conserva tal cual; solo al confirmarla se olvidan el uuid, las líneas y el cliente, para que la siguiente venta empiece limpia
import { createAsyncThunk } from '@reduxjs/toolkit'
import { toast } from '@/global/helpers/toast'
import { selectRequestContext } from '@/features/auth'
import { toWarehouseNumber } from '../helpers/shop.helpers'
import { registerSale } from '../services/shop.sales.service'
import { failWith, NO_SESSION, noOtherChangeRunning, type ThunkConfig } from './shop.cart.thunks'
import { loadProductsThunk } from './shop.products.thunks'
import type { PaymentMethod, RegisteredSale } from '../types/shop.sales.types'

export const checkoutThunk = createAsyncThunk<RegisteredSale, PaymentMethod, ThunkConfig>(
  'shop/checkout',
  async (paymentMethod, { getState, dispatch, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)
    const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
    if (warehouseId === undefined) return rejectWithValue(failWith(null, 'Elige una bodega antes de finalizar el pedido.'))
    const { cartUuid, cartCustomer } = state.shop
    if (!cartUuid || state.cart.items.length === 0) return rejectWithValue(failWith(null, 'El carrito está vacío.'))

    // una venta a crédito necesita cliente: sin él el cargo quedaría a nombre del vendedor de la sesión
    if (paymentMethod === 'credit' && !cartCustomer) return rejectWithValue(failWith(null, 'Elige el cliente de la venta para venderla a crédito.'))

    const totalAmount = state.cart.items.reduce((sum, item) => sum + item.subtotal, 0)
    try {
      const sale = await registerSale(ctx, { uuid: cartUuid, customerId: cartCustomer?.id, warehouseId, paymentMethod, totalAmount })
      toast.success(sale.serialCode ? `Pedido ${sale.serialCode} registrado.` : 'Pedido registrado.')
      dispatch(loadProductsThunk()) // la venta movió el stock: se refresca el catálogo
      return sale
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo registrar el pedido.'))
    }
  },
  { condition: noOtherChangeRunning }
)
