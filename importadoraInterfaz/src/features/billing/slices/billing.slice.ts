// billing.slice · facturas de la bodega, datos fiscales y series de consecutivos
// conecta con: billing.thunks (lo llenan) y billing.selectors (lo leen); clave 'billing' en rootReducer (NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al cambiar de compañía rootReducer lo reinicia
import { createSlice } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_BILLING_STATE } from '../constants/billing.constants'
import { loadBillingSettingsThunk, loadInvoicesThunk, saveBillingConfigThunk, saveDocSeriesThunk } from '../thunks/billing.thunks'

export const billingSlice = createSlice({
  name: 'billing',
  initialState: INITIAL_BILLING_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadInvoicesThunk.pending, (state, action) => {
        const nextWhId = action.meta.arg ?? null
        if (state.warehouseId !== nextWhId) {
          state.invoices = []
          state.config = null
          state.series = []
          state.settingsStatus = 'idle'
        }
        state.warehouseId = nextWhId
        state.invoicesStatus = 'loading'
        state.invoicesError = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadInvoicesThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.invoices = action.payload
        state.invoicesStatus = 'succeeded'
      })
      .addCase(loadInvoicesThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.invoicesStatus = 'failed'
        state.invoicesError = action.payload ?? 'No se pudieron cargar las facturas.'
      })
      .addCase(loadBillingSettingsThunk.pending, (state, action) => {
        if (state.warehouseId !== action.meta.arg) {
          state.invoices = []
          state.invoicesStatus = 'idle'
          state.config = null
          state.series = []
        }
        state.warehouseId = action.meta.arg
        state.settingsStatus = 'loading'
        state.settingsError = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadBillingSettingsThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.config = action.payload.config
        state.series = action.payload.series
        state.settingsStatus = 'succeeded'
      })
      .addCase(loadBillingSettingsThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.settingsStatus = 'failed'
        state.settingsError = action.payload ?? 'No se pudo cargar la configuración de facturación.'
      })
      .addCase(saveBillingConfigThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(saveBillingConfigThunk.fulfilled, (state, action) => {
        state.saving = false
        state.config = action.payload
      })
      .addCase(saveBillingConfigThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(saveDocSeriesThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(saveDocSeriesThunk.fulfilled, (state, action) => {
        state.saving = false
        const item = state.series.find((s) => s.id === action.payload.id)
        if (item) {
          item.prefix = action.payload.prefix
          item.nextNumber = action.payload.nextNumber
        }
      })
      .addCase(saveDocSeriesThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_BILLING_STATE)
  },
})

export const billingReducer = billingSlice.reducer
