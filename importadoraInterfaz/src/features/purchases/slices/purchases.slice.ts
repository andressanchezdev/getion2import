// purchases.slice · órdenes de compra: lista de la bodega o global, detalle y guardados
// conecta con: purchases.thunks (lo llenan) y purchases.selectors (lo leen); clave 'purchases' en rootReducer (NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al cambiar de compañía rootReducer lo reinicia
import { createSlice } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_PURCHASES_STATE } from '../constants/purchases.constants'
import {
  createPurchaseThunk,
  loadPurchaseDetailThunk,
  loadPurchasesThunk,
  payPurchaseThunk,
  receivePurchaseThunk,
  voidPurchaseThunk,
} from '../thunks/purchases.thunks'

export const purchasesSlice = createSlice({
  name: 'purchases',
  initialState: INITIAL_PURCHASES_STATE,
  reducers: {
    // abre una orden en el panel: queda marcada hasta que llegue su detalle
    openPurchase: (state, action: { payload: number }) => {
      state.detail = { id: action.payload, data: state.detail.id === action.payload ? state.detail.data : null, status: 'loading', error: null, requestId: null }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPurchasesThunk.pending, (state, action) => {
        const nextWhId = action.meta.arg ?? null
        if (state.warehouseId !== nextWhId) state.items = []
        state.warehouseId = nextWhId
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadPurchasesThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(loadPurchasesThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = []
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron cargar las compras.'
      })
      .addCase(loadPurchaseDetailThunk.pending, (state, action) => {
        state.detail.status = 'loading'
        state.detail.error = null
        state.detail.requestId = action.meta.requestId
      })
      .addCase(loadPurchaseDetailThunk.fulfilled, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.data = action.payload
        state.detail.status = 'succeeded'
      })
      .addCase(loadPurchaseDetailThunk.rejected, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.status = 'failed'
        state.detail.error = action.payload ?? 'No se pudo cargar la orden de compra.'
      })
      .addCase(createPurchaseThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(createPurchaseThunk.fulfilled, (state, action) => {
        state.saving = false
        state.items.unshift({ ...action.payload, items: [] })
      })
      .addCase(createPurchaseThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(payPurchaseThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(payPurchaseThunk.fulfilled, (state, action) => {
        state.saving = false
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = { ...state.items[index], paidTotal: action.payload.paidTotal }
        if (state.detail.data?.id === action.payload.id) state.detail.data = action.payload
      })
      .addCase(payPurchaseThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(receivePurchaseThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(receivePurchaseThunk.fulfilled, (state, action) => {
        state.saving = false
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
        if (state.detail.data?.id === action.payload.id) state.detail.data = action.payload
      })
      .addCase(receivePurchaseThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(voidPurchaseThunk.pending, (state) => {
        state.saving = true
      })
      .addCase(voidPurchaseThunk.fulfilled, (state, action) => {
        state.saving = false
        const target = state.items.find((item) => item.id === action.payload)
        if (target) target.status = 'voided'
        if (state.detail.data?.id === action.payload) state.detail.data.status = 'voided'
      })
      .addCase(voidPurchaseThunk.rejected, (state) => {
        state.saving = false
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_PURCHASES_STATE)
  },
})

export const { openPurchase } = purchasesSlice.actions
export const purchasesReducer = purchasesSlice.reducer
