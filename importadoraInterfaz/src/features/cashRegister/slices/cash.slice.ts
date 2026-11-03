// cash.slice · estado del turno de caja de la bodega activa: el turno abierto (o ninguno), si está cargando y si hay un cambio en curso
// conecta con: cash.thunks (lo llenan), cash.selectors (lecturas), auth (al cerrar sesión se vacía) y rootReducer (clave 'cash'; NO se guarda en el navegador)
// ojo: al cerrar el turno la sesión queda en null (la bodega pasa a «caja cerrada»); la carga de una bodega anterior se descarta por su requestId
// ojo: NO se vacía con setActiveWarehouse (esa acción se repite con la misma bodega al cargar la lista y borraría el turno recién leído); useCashSession ignora el turno de otra bodega por warehouseId
import { createSlice } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { closeCashSessionThunk, loadCashSessionThunk, openCashSessionThunk } from '../thunks/cash.thunks'
import type { CashState } from '../types/cash.types'

export const INITIAL_CASH_STATE: CashState = { warehouseId: null, session: null, status: 'idle', error: null, saving: false, requestId: null }

export const cashSlice = createSlice({
  name: 'cash',
  initialState: INITIAL_CASH_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCashSessionThunk.pending, (state, action) => {
        if (state.warehouseId !== action.meta.arg) state.session = null
        state.warehouseId = action.meta.arg
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadCashSessionThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.session = action.payload
        state.status = 'succeeded'
      })
      .addCase(loadCashSessionThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudo consultar el turno de caja.'
      })
      .addCase(openCashSessionThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(openCashSessionThunk.fulfilled, (state, action) => {
        state.saving = false
        state.session = action.payload
        state.warehouseId = action.payload.warehouseId
        state.status = 'succeeded'
      })
      .addCase(openCashSessionThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(closeCashSessionThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(closeCashSessionThunk.fulfilled, (state) => {
        state.saving = false
        state.session = null
        state.status = 'succeeded'
      })
      .addCase(closeCashSessionThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_CASH_STATE)
  },
})

export const cashReducer = cashSlice.reducer
export default cashSlice.reducer
