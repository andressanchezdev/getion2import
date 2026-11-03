// quotations.slice · estado de cotizaciones: lista, página, filtros (texto y fechas) y la cotización abierta en el panel
// conecta con: quotations.thunks (lo llenan), quotations.selectors (lecturas) y rootReducer (clave 'quotations'; NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al saltar de compañía rootReducer lo reinicia
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_QUOTATION_FILTERS, INITIAL_QUOTATIONS_STATE } from '../constants/quotations.constants'
import { loadQuotationDetailThunk, loadQuotationsThunk, markQuotationSentThunk } from '../thunks/quotations.thunks'
import type { QuotationFilters } from '../types/quotations.types'

export const quotationsSlice = createSlice({
  name: 'quotations',
  initialState: INITIAL_QUOTATIONS_STATE,
  reducers: {
    setQuotationFilters: (state, action: PayloadAction<Partial<QuotationFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
      state.list.page = 1
    },
    resetQuotationFilters: (state) => {
      state.filters = INITIAL_QUOTATION_FILTERS
      state.list.page = 1
    },
    setQuotationsPage: (state, action: PayloadAction<number>) => {
      state.list.page = Math.max(1, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadQuotationsThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadQuotationsThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload
        state.list.status = 'succeeded'
      })
      .addCase(loadQuotationsThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar las cotizaciones.'
      })
      .addCase(loadQuotationDetailThunk.pending, (state, action) => {
        state.detail = { id: action.meta.arg, data: null, status: 'loading', error: null }
      })
      .addCase(loadQuotationDetailThunk.fulfilled, (state, action) => {
        if (state.detail.id !== action.payload.id) return
        state.detail = { id: action.payload.id, data: action.payload, status: 'succeeded', error: null }
      })
      .addCase(loadQuotationDetailThunk.rejected, (state, action) => {
        if (state.detail.id !== action.meta.arg) return
        state.detail = { id: action.meta.arg, data: null, status: 'failed', error: action.payload ?? 'No se pudo cargar la cotización.' }
      })
      .addCase(markQuotationSentThunk.fulfilled, (state, action) => {
        const row = state.list.items.find((item) => item.id === action.payload)
        if (row) row.status = 'sent'
        if (state.detail.data?.id === action.payload) state.detail.data.status = 'sent'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_QUOTATIONS_STATE)
  },
})

export const { setQuotationFilters, resetQuotationFilters, setQuotationsPage } = quotationsSlice.actions
export const quotationsReducer = quotationsSlice.reducer
export default quotationsSlice.reducer
