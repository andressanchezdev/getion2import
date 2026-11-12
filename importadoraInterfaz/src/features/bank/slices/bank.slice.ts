// bank.slice · estado de la conciliación bancaria: movimientos del PDF (con filtros y página), subida del PDF y pagos por verificar
// conecta con: bank.thunks (lo llenan), bank.selectors (lecturas) y rootReducer (clave 'bank'; NO se guarda en el navegador)
// ojo: cambiar un filtro vuelve a la página 1; la lista arranca vacía (no hay datos de ejemplo)
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_BANK_FILTERS, INITIAL_BANK_STATE } from '../constants/bank.constants'
import { confirmBankRecordThunk, ignoreBankRecordThunk, loadBankRecordsThunk, loadPendingPaymentsThunk, uploadBankStatementThunk } from '../thunks/bank.thunks'
import type { BankFilters, BankRecordStatus, PendingPayment } from '../types/bank.types'

const changes = [confirmBankRecordThunk, ignoreBankRecordThunk] as const

export const bankSlice = createSlice({
  name: 'bank',
  initialState: INITIAL_BANK_STATE,
  reducers: {
    setBankFilters: (state, action: PayloadAction<Partial<BankFilters>>) => {
      state.list.filters = { ...state.list.filters, ...action.payload }
      state.list.page = 1
    },
    clearBankFilters: (state) => {
      state.list.filters = INITIAL_BANK_FILTERS
      state.list.page = 1
    },
    setBankPage: (state, action: PayloadAction<number>) => {
      state.list.page = Math.max(1, action.payload)
    },
    clearBankUploadResult: (state) => {
      state.upload = INITIAL_BANK_STATE.upload
    },
    // tiempo real (bank_record.status_changed): el movimiento cambia de estado; si ya no cumple el filtro sale de la tabla, y su pago deja de estar por verificar
    bankRecordStatusFromEvent: (state, action: PayloadAction<{ id: number; to: BankRecordStatus; by: string; at: string; paymentId: number | null }>) => {
      const { id, to, by, at, paymentId } = action.payload
      const idx = state.list.items.findIndex((record) => record.id === id)
      if (idx >= 0) {
        const filter = state.list.filters.status
        if (filter !== 'all' && filter !== to) state.list.items.splice(idx, 1)
        else state.list.items[idx] = { ...state.list.items[idx], status: to, confirmedBy: by, confirmedAt: at }
      }
      if (paymentId !== null) state.pendingPayments.items = state.pendingPayments.items.filter((payment) => payment.id !== paymentId)
    },
    // tiempo real (payment.created de transferencia en revisión): entra a los pagos por verificar si la lista ya está cargada
    pendingPaymentAddedFromEvent: (state, action: PayloadAction<PendingPayment>) => {
      if (state.pendingPayments.status !== 'succeeded') return
      if (!state.pendingPayments.items.some((payment) => payment.id === action.payload.id)) state.pendingPayments.items.unshift(action.payload)
    },
    // tiempo real (payment.status_changed): un pago que salió de revisión ya no está por verificar
    pendingPaymentRemovedFromEvent: (state, action: PayloadAction<number>) => {
      state.pendingPayments.items = state.pendingPayments.items.filter((payment) => payment.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBankRecordsThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadBankRecordsThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload.items
        state.list.meta = action.payload.meta
        state.list.status = 'succeeded'
      })
      .addCase(loadBankRecordsThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar los movimientos del banco.'
      })
      .addCase(uploadBankStatementThunk.pending, (state) => {
        state.upload = { status: 'loading', error: null, result: null }
      })
      .addCase(uploadBankStatementThunk.fulfilled, (state, action) => {
        state.upload = { status: 'succeeded', error: null, result: action.payload }
      })
      .addCase(uploadBankStatementThunk.rejected, (state, action) => {
        state.upload = { status: 'failed', error: action.payload ?? 'No se pudo leer el PDF del banco.', result: null }
      })
      .addCase(loadPendingPaymentsThunk.pending, (state) => {
        state.pendingPayments.status = 'loading'
        state.pendingPayments.error = null
      })
      .addCase(loadPendingPaymentsThunk.fulfilled, (state, action) => {
        state.pendingPayments = { items: action.payload, status: 'succeeded', error: null }
      })
      .addCase(loadPendingPaymentsThunk.rejected, (state, action) => {
        state.pendingPayments.status = 'failed'
        state.pendingPayments.error = action.payload ?? 'No se pudieron cargar los pagos por verificar.'
      })
      // confirmar e ignorar: mientras uno corre no se acepta otro; ojo: los matchers van después de todos los addCase
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.pending)), (state) => {
        state.saving = true
      })
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.fulfilled), ...changes.map((thunk) => thunk.rejected)), (state) => {
        state.saving = false
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_BANK_STATE
      )
  },
})

export const { setBankFilters, clearBankFilters, setBankPage, clearBankUploadResult, bankRecordStatusFromEvent, pendingPaymentAddedFromEvent, pendingPaymentRemovedFromEvent } = bankSlice.actions
export const bankReducer = bankSlice.reducer
export default bankSlice.reducer
