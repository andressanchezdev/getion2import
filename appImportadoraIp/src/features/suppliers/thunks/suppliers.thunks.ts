// suppliers.thunks · carga la lista paginada de proveedores y sus totales
// conecta con: suppliers.service (llamadas), auth (selectRequestContext) y suppliers.slice (reacciona); los despacha useSuppliersLoader
// ojo: la lista lee página y búsqueda del slice; cada carga lleva su requestId y el slice descarta respuestas viejas
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { SUPPLIERS_PAGE_SIZE } from '../constants/suppliers.constants'
import { fetchSuppliersPage, fetchSuppliersSummary } from '../services/suppliers.service'
import type { Supplier, SuppliersState, SuppliersSummary } from '../types/suppliers.types'

type ThunkState = { auth: AuthState; suppliers: SuppliersState }
type Config = { state: ThunkState; rejectValue: string }

const NO_SESSION = 'No hay una sesión activa.'

export interface SuppliersResult {
  items: Supplier[]
  meta: PaginatorMetadata
}

export const loadSuppliersThunk = createAsyncThunk<SuppliersResult, void, Config>('suppliers/loadList', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchSuppliersPage(ctx, state.suppliers.page, SUPPLIERS_PAGE_SIZE, state.suppliers.query)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los proveedores.'))
  }
})

export const loadSuppliersSummaryThunk = createAsyncThunk<SuppliersSummary, void, Config>('suppliers/loadSummary', async (_, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchSuppliersSummary(ctx)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los totales de proveedores.'))
  }
})
