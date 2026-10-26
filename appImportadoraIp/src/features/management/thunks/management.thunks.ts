// management.thunks · carga los pedidos por etapa de la bodega activa (con el desglose por canal) y la lista de pedidos de una etapa y un canal
// conecta con: management.service (llamada), auth (selectRequestContext), navigation (bodega activa) y management.slice (reacciona); la despacha useManagementLoader
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; sin bodega elegida no se llama al backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { NO_WAREHOUSE_MANAGEMENT, ORDERS_PAGE_SIZE } from '../constants/management.constants'
import { fetchPipeline, fetchStageOrders } from '../services/management.service'
import type { ManagementOrder, ManagementState, PipelineData } from '../types/management.types'

type ThunkState = { auth: AuthState; ui: NavigationState; management: ManagementState }

export const loadPipelineThunk = createAsyncThunk<PipelineData, void, { state: ThunkState; rejectValue: string }>('management/loadPipeline', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_MANAGEMENT)
  try {
    return await fetchPipeline(ctx, warehouseId, state.management.selected)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los pedidos por etapa.'))
  }
})

export interface StageOrdersResult {
  items: ManagementOrder[]
  meta: PaginatorMetadata
}

// lee la etapa, el canal y la página del estado; sin canal elegido no hay nada que listar
export const loadStageOrdersThunk = createAsyncThunk<StageOrdersResult, void, { state: ThunkState; rejectValue: string }>('management/loadOrders', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_MANAGEMENT)
  const { selected, channel, orders } = state.management
  if (!channel) return rejectWithValue('Elige un canal para ver sus pedidos.')
  try {
    return await fetchStageOrders(ctx, warehouseId, selected, channel, orders.page, ORDERS_PAGE_SIZE)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los pedidos de esta etapa.'))
  }
})
