// quotations.thunks · carga la lista de cotizaciones (con su filtro de estado y página) y los totales
// conecta con: quotations.service (llamadas), auth (selectRequestContext) y quotations.slice (reacciona); los despacha useQuotationsLoader
// ojo: la lista lee página y filtro del slice; cada carga lleva su requestId y el slice descarta respuestas viejas
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { QUOTATIONS_PAGE_SIZE } from '../constants/quotations.constants'
import { fetchQuotationsPage, fetchQuotationStats } from '../services/quotations.service'
import type { Quotation, QuotationsState, QuotationStats } from '../types/quotations.types'

type Config = { state: { auth: AuthState; quotations: QuotationsState }; rejectValue: string }

export interface QuotationsResult {
  items: Quotation[]
  meta: PaginatorMetadata
}

export const loadQuotationsThunk = createAsyncThunk<QuotationsResult, void, Config>('quotations/loadList', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  try {
    return await fetchQuotationsPage(ctx, state.quotations.page, QUOTATIONS_PAGE_SIZE, state.quotations.statusFilter)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las cotizaciones.'))
  }
})

export const loadQuotationStatsThunk = createAsyncThunk<QuotationStats, void, { rejectValue: string }>('quotations/loadStats', async (_, { rejectWithValue }) => {
  try {
    return await fetchQuotationStats()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los totales de cotizaciones.'))
  }
})
