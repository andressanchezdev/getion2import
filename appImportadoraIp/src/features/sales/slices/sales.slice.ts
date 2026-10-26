// sales.slice · estado de ventas: historial y carritos pendientes, cada uno con su página, estado y error
// conecta con: sales.thunks (lo llenan), sales.selectors (lecturas) y rootReducer (clave 'sales'; NO se guarda en el navegador)
// ojo: cada lista descarta las respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_SALES_STATE } from '../constants/sales.constants'
import { loadPendingCartsThunk, loadSalesHistoryThunk } from '../thunks/sales.thunks'

export const salesSlice = createSlice({
  name: 'sales',
  initialState: INITIAL_SALES_STATE,
  reducers: {
    setHistoryPage: (state, action: PayloadAction<number>) => {
      state.history.page = Math.max(1, action.payload)
    },
    setPendingPage: (state, action: PayloadAction<number>) => {
      state.pending.page = Math.max(1, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSalesHistoryThunk.pending, (state, action) => {
        state.history.status = 'loading'
        state.history.error = null
        state.history.requestId = action.meta.requestId
      })
      .addCase(loadSalesHistoryThunk.fulfilled, (state, action) => {
        if (state.history.requestId !== action.meta.requestId) return
        state.history.items = action.payload.items
        state.history.meta = action.payload.meta
        state.history.status = 'succeeded'
      })
      .addCase(loadSalesHistoryThunk.rejected, (state, action) => {
        if (state.history.requestId !== action.meta.requestId) return
        state.history.status = 'failed'
        state.history.error = action.payload ?? 'No se pudo cargar el historial de ventas.'
      })
      .addCase(loadPendingCartsThunk.pending, (state, action) => {
        state.pending.status = 'loading'
        state.pending.error = null
        state.pending.requestId = action.meta.requestId
      })
      .addCase(loadPendingCartsThunk.fulfilled, (state, action) => {
        if (state.pending.requestId !== action.meta.requestId) return
        state.pending.items = action.payload.items
        state.pending.meta = action.payload.meta
        state.pending.status = 'succeeded'
      })
      .addCase(loadPendingCartsThunk.rejected, (state, action) => {
        if (state.pending.requestId !== action.meta.requestId) return
        state.pending.status = 'failed'
        state.pending.error = action.payload ?? 'No se pudieron cargar los pedidos pendientes.'
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_SALES_STATE
      )
  },
})

export const { setHistoryPage, setPendingPage } = salesSlice.actions
export const salesReducer = salesSlice.reducer
export default salesSlice.reducer
