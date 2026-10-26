// quotations.slice · estado de cotizaciones: lista paginada con filtro de estado, y totales
// conecta con: quotations.thunks (lo llenan), quotations.selectors (lecturas) y rootReducer (clave 'quotations'; NO se guarda en el navegador)
// ojo: al cambiar el filtro se vuelve a la página 1; la lista descarta respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_QUOTATIONS_STATE } from '../constants/quotations.constants'
import { loadQuotationsThunk, loadQuotationStatsThunk } from '../thunks/quotations.thunks'

export const quotationsSlice = createSlice({
  name: 'quotations',
  initialState: INITIAL_QUOTATIONS_STATE,
  reducers: {
    setQuotationsPage: (state, action: PayloadAction<number>) => {
      state.page = Math.max(1, action.payload)
    },
    setQuotationsFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload
      state.page = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadQuotationsThunk.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadQuotationsThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = action.payload.items
        state.meta = action.payload.meta
        state.status = 'succeeded'
      })
      .addCase(loadQuotationsThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron cargar las cotizaciones.'
      })
      .addCase(loadQuotationStatsThunk.pending, (state) => {
        state.stats.status = 'loading'
        state.stats.error = null
      })
      .addCase(loadQuotationStatsThunk.fulfilled, (state, action) => {
        state.stats.data = action.payload
        state.stats.status = 'succeeded'
      })
      .addCase(loadQuotationStatsThunk.rejected, (state, action) => {
        state.stats.status = 'failed'
        state.stats.error = action.payload ?? 'No se pudieron cargar los totales de cotizaciones.'
      })
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_QUOTATIONS_STATE
      )
  },
})

export const { setQuotationsPage, setQuotationsFilter } = quotationsSlice.actions
export const quotationsReducer = quotationsSlice.reducer
export default quotationsSlice.reducer
