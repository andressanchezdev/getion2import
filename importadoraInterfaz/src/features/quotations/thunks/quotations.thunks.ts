// quotations.thunks · carga la lista de cotizaciones, el detalle de una y la marca como enviada
// conecta con: quotations.service (llamadas) y auth (selectRequestContext); las despachan useQuotationsLoader y QuotationDetailPanel
// ojo: la lista lleva su requestId y el slice descarta las respuestas de cargas anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { fetchQuotationDetail, fetchQuotations, updateQuotation } from '../services/quotations.service'
import type { Quotation } from '../types/quotations.types'

type ThunkState = { auth: AuthState; ui?: { activeCompanyId?: number } }
const NO_SESSION = 'No hay una sesión activa.'

export const loadQuotationsThunk = createAsyncThunk<Quotation[], void, { state: ThunkState; rejectValue: string }>(
  'quotations/loadList',
  async (_, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return await fetchQuotations(ctx)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las cotizaciones.'))
    }
  }
)

export const loadQuotationDetailThunk = createAsyncThunk<Quotation, number, { state: ThunkState; rejectValue: string }>(
  'quotations/loadDetail',
  async (id, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return await fetchQuotationDetail(ctx, id)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la cotización.'))
    }
  }
)

// al enviarla por WhatsApp pasa a «Enviada»; devuelve el id para que el slice actualice la fila
export const markQuotationSentThunk = createAsyncThunk<number, number, { rejectValue: string }>(
  'quotations/markSent',
  async (id, { rejectWithValue }) => {
    try {
      await updateQuotation(id, { status: 'sent' })
      return id
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo marcar la cotización como enviada.'))
    }
  }
)
