// cash.slice · estado del turno de caja de la bodega activa: el turno abierto (o ninguno), si está cargando y si hay un cambio en curso
// conecta con: cash.thunks (lo llenan), cash.selectors (lecturas), auth (al cerrar sesión se vacía) y rootReducer (clave 'cash'; NO se guarda en el navegador)
// ojo: al cerrar el turno la sesión queda en null (la bodega pasa a «caja cerrada»); la carga de una bodega anterior se descarta por su requestId
// ojo: NO se vacía con setActiveWarehouse (esa acción se repite con la misma bodega al cargar la lista y borraría el turno recién leído); useCashSession ignora el turno de otra bodega por warehouseId
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { closeCashSessionThunk, loadCashSessionThunk, openCashSessionThunk } from '../thunks/cash.thunks'
import type { CashState } from '../types/cash.types'

export const INITIAL_CASH_STATE: CashState = { warehouseId: null, session: null, status: 'idle', error: null, saving: false, requestId: null, closedTick: 0 }

export const cashSlice = createSlice({
  name: 'cash',
  initialState: INITIAL_CASH_STATE,
  reducers: {
    // tiempo real (cash_session.totals_changed): los totales vivos del turno abierto en pantalla; los de otro turno se ignoran
    cashTotalsFromEvent: (
      state,
      action: PayloadAction<{ sessionId: number; cashIn: number; transferIn: number; abonosIn?: number; paymentsCount?: number; expenses: number; expectedCash: number }>
    ) => {
      const session = state.session
      if (!session || session.id !== action.payload.sessionId || session.status !== 'open') return
      session.cashTotal = action.payload.cashIn
      session.transferTotal = action.payload.transferIn
      session.expensesCash = action.payload.expenses
      session.expectedCash = action.payload.expectedCash
      if (action.payload.abonosIn !== undefined) session.abonosTotal = action.payload.abonosIn
      if (action.payload.paymentsCount !== undefined) session.paymentsCount = action.payload.paymentsCount
    },
    // tiempo real (cash_session.status_changed → closed): si es el turno en pantalla la bodega queda en «caja cerrada»; siempre avisa a la lista de Facturas
    cashSessionClosedFromEvent: (state, action: PayloadAction<number>) => {
      if (state.session?.id === action.payload) state.session = null
      state.closedTick += 1
    },
  },
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

export const { cashTotalsFromEvent, cashSessionClosedFromEvent } = cashSlice.actions
export const cashReducer = cashSlice.reducer
export default cashSlice.reducer
