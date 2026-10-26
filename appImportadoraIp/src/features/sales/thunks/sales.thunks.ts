// sales.thunks · carga el historial de ventas y los carritos pendientes de la bodega activa, y anula una venta
// conecta con: sales.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y sales.slice (reacciona); las despachan useSalesList y las pantallas
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; sin bodega elegida no se llama al backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { toast } from '@/global/helpers/toast'
import { cancelSale, type CancelSaleInput } from '@/features/shop'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { NO_WAREHOUSE_MESSAGE, SALES_PAGE_SIZE } from '../constants/sales.constants'
import { fetchPendingCarts, fetchSalesHistory } from '../services/sales.service'
import type { PendingCart, SaleRow, SalesState } from '../types/sales.types'

type ThunkState = { auth: AuthState; ui: NavigationState; sales: SalesState }
type Config = { state: ThunkState; rejectValue: string }

const NO_SESSION = 'No hay una sesión activa.'

export interface SalesPageResult<T> {
  items: T[]
  meta: PaginatorMetadata
}

export const loadSalesHistoryThunk = createAsyncThunk<SalesPageResult<SaleRow>, void, Config>('sales/loadHistory', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_MESSAGE)
  try {
    return await fetchSalesHistory(ctx, warehouseId, state.sales.history.page, SALES_PAGE_SIZE)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el historial de ventas.'))
  }
})

export const loadPendingCartsThunk = createAsyncThunk<SalesPageResult<PendingCart>, void, Config>('sales/loadPending', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_MESSAGE)
  try {
    return await fetchPendingCarts(ctx, warehouseId, state.sales.pending.page, SALES_PAGE_SIZE)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los pedidos pendientes.'))
  }
})

// anula una venta con su motivo (POST /sales/cancel) y vuelve a leer el historial; el aviso de éxito o error sale aquí, en un solo lugar
// ojo: el backend devuelve el stock "si aplica"; no se asume nada más sobre el estado final de la venta
export const cancelSaleThunk = createAsyncThunk<void, CancelSaleInput, Config>('sales/cancel', async (input, { getState, dispatch, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    await cancelSale(ctx, input)
    toast.success('Venta anulada.')
    dispatch(loadSalesHistoryThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'No se pudo anular la venta.')
    toast.error(message)
    return rejectWithValue(message)
  }
})
