// orders.thunks · carga los conteos por etapa, la tabla de pedidos y el detalle de uno, y anula un pedido
// conecta con: orders.service (llamadas), auth (selectRequestContext), navigation (bodega activa), features/shop (cancelSale) y orders.slice (reacciona); las despachan useOrdersLoader, useOpenOrderDetail y las pantallas
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; sin bodega elegida no se llama al backend; el aviso de anulación sale aquí, en un solo lugar
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/toast'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { cancelSale, type CancelSaleInput } from '@/features/shop'
import { NO_WAREHOUSE_ORDERS } from '../constants/orders.constants'
import { fetchOrderCounts, fetchOrderDetail, fetchOrders, type OrdersResult } from '../services/orders.service'
import type { OrderDetail, OrdersState, StageCounts } from '../types/orders.types'

type ThunkState = { auth: AuthState; ui: NavigationState; orders: OrdersState }
type Config = { state: ThunkState; rejectValue: string }

const NO_SESSION = 'No hay una sesión activa.'

export const loadOrderCountsThunk = createAsyncThunk<StageCounts, void, Config>('orders/loadCounts', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_ORDERS)
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
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_ORDERS)
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
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_ORDERS)
  try {
    return await fetchOrderDetail(ctx, warehouseId, saleId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el detalle del pedido.'))
  }
})

// anula un pedido con su motivo (POST /sales/cancel) y vuelve a leer la tabla y los conteos; el backend devuelve el stock «si aplica»
export const cancelOrderThunk = createAsyncThunk<void, CancelSaleInput, Config>('orders/cancel', async (input, { getState, dispatch, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    await cancelSale(ctx, input)
    toast.success('Pedido anulado.')
    dispatch(loadOrdersThunk())
    dispatch(loadOrderCountsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'No se pudo anular el pedido.')
    toast.error(message)
    return rejectWithValue(message)
  }
})
