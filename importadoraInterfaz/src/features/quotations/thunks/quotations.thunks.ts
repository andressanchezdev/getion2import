// quotations.thunks · carga la lista de cotizaciones, el detalle de una, la marca como enviada, la crea y busca los clientes y productos del formulario
// conecta con: quotations.service (llamadas), shop (searchProducts) y auth (selectRequestContext); las despachan useQuotationsLoader, useQuotationForm y QuotationDetailPanel
// ojo: la lista lleva su requestId y el slice descarta las respuestas de cargas anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { searchProducts } from '@/features/shop'
import { toast } from '@/global/helpers/feedback/toast'
import { toCustomerOption, toProductOption } from '../helpers/quotations.draft'
import { createQuotation, fetchQuotationDetail, fetchQuotations, searchCustomers, updateQuotation } from '../services/quotations.service'
import type { CreateQuotationBody } from '../types/quotations.api.types'
import type { Quotation, QuotationCustomerOption, QuotationProductOption } from '../types/quotations.types'

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

const SEARCH_LIMIT = 8

export const searchQuotationCustomersThunk = createAsyncThunk<QuotationCustomerOption[], string, { rejectValue: string }>(
  'quotations/searchCustomers',
  async (text, { rejectWithValue }) => {
    try {
      return (await searchCustomers(text, SEARCH_LIMIT)).map(toCustomerOption)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar los clientes.'))
    }
  }
)

export const searchQuotationProductsThunk = createAsyncThunk<QuotationProductOption[], string, { state: ThunkState; rejectValue: string }>(
  'quotations/searchProducts',
  async (text, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return (await searchProducts(ctx, text, SEARCH_LIMIT)).map(toProductOption)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar los productos.'))
    }
  }
)

// crea la cotización, avisa y recarga la lista; devuelve el id
export const createQuotationThunk = createAsyncThunk<number, CreateQuotationBody, { state: ThunkState; rejectValue: string }>(
  'quotations/create',
  async (body, { dispatch, rejectWithValue }) => {
    try {
      const id = await createQuotation(body)
      toast.success('¡Cotización creada exitosamente!')
      dispatch(loadQuotationsThunk())
      return id
    } catch (error) {
      const message = getErrorMessage(error, 'Error al crear la cotización')
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)
