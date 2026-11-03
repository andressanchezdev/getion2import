// orders.thunks · carga los conteos por etapa, la tabla de pedidos y el detalle de uno; anula un pedido y verifica el comprobante de una transferencia
// conecta con: orders.service (llamadas), auth (selectRequestContext), features/shop (cancelSale) y orders.slice (reacciona); las despachan useOrdersLoader, useOpenOrderDetail y las pantallas
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; si selectedWarehouseId es null se consultan todas las bodegas a nivel general
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { cancelSale, type CancelSaleInput } from '@/features/shop'
import { fetchOrderCounts, fetchOrderDetail, fetchOrders, verifyTransferPayment, type OrdersResult } from '../services/orders.service'
import type { OrderDetail, OrdersState, StageCounts } from '../types/orders.types'

type ThunkState = { auth: AuthState; ui: NavigationState; orders: OrdersState }
type Config = { state: ThunkState; rejectValue: string }

const NO_SESSION = 'No hay una sesión activa.'

export const loadOrderCountsThunk = createAsyncThunk<StageCounts, void, Config>('orders/loadCounts', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  // null = consulta general de todas las bodegas; number = filtro específico
  const warehouseId = state.orders.selectedWarehouseId ?? undefined
  try {
    return await fetchOrderCounts(ctx, warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los conteos de pedidos.'))
  }
})

export const loadOrdersThunk = createAsyncThunk<OrdersResult, void, Config>('orders/load', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  // null = consulta general de todas las bodegas; number = filtro específico
  const warehouseId = state.orders.selectedWarehouseId ?? undefined
  try {
    return await fetchOrders(ctx, warehouseId, state.orders.stage, state.orders.channel)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los pedidos.'))
  }
})

export const loadOrderDetailThunk = createAsyncThunk<OrderDetail, number, Config>('orders/loadDetail', async (saleId, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = state.orders.selectedWarehouseId ?? undefined
  try {
    return await fetchOrderDetail(ctx, warehouseId, saleId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el detalle del pedido.'))
  }
})

export const cancelOrderThunk = createAsyncThunk<void, CancelSaleInput, Config>('orders/cancel', async (input, { getState, dispatch, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    await cancelSale(ctx, input)
    toast.success('Pedido anulado exitosamente.')
    dispatch(loadOrdersThunk())
    dispatch(loadOrderCountsThunk())
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo anular el pedido.'))
  }
})

export const verifyTransferPaymentThunk = createAsyncThunk<void, OrderDetail, Config>(
  'orders/verifyTransfer',
  async (order, { dispatch, rejectWithValue }) => {
    try {
      await verifyTransferPayment(order)
      toast.success('Comprobante verificado exitosamente.')
      dispatch(loadOrdersThunk())
      dispatch(loadOrderCountsThunk())
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo verificar el comprobante.'))
    }
  }
)
