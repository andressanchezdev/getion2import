// inventory.thunks · carga el control de inventario: la página filtrada por bodega o, si hay texto, la búsqueda del backend
// conecta con: inventory.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y inventory.slice (reacciona); lo despacha useInventoryLoader
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; con texto no hay paginación (meta null)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { INVENTORY_PAGE_SIZE, INVENTORY_SEARCH_LIMIT } from '../constants/inventory.constants'
import { fetchInventoryPage, searchInventory } from '../services/inventory.service'
import type { InventoryState, StockItem } from '../types/inventory.types'

type ThunkState = { auth: AuthState; ui: NavigationState; inventory: InventoryState }
type Config = { state: ThunkState; rejectValue: string }

export interface InventoryResult {
  items: StockItem[]
  meta: PaginatorMetadata | null
}

export const loadInventoryThunk = createAsyncThunk<InventoryResult, void, Config>('inventory/load', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  const { query, page, onlyInStock } = state.inventory
  try {
    if (query.trim()) return { items: await searchInventory(ctx, query, INVENTORY_SEARCH_LIMIT, warehouseId), meta: null }
    const result = await fetchInventoryPage(ctx, { page, pageSize: INVENTORY_PAGE_SIZE, warehouseId, onlyInStock })
    return { items: result.items, meta: result.meta }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el inventario.'))
  }
})
