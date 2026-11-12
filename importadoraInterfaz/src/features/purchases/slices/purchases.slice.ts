// purchases.slice · órdenes de compra: lista de la bodega o global, detalle y guardados
// conecta con: purchases.thunks (lo llenan) y purchases.selectors (lo leen); clave 'purchases' en rootReducer (NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al cambiar de compañía rootReducer lo reinicia
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
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
import type { Purchase, PurchaseStatus } from '../types/purchases.types'

export const purchasesSlice = createSlice({
  name: 'purchases',
  initialState: INITIAL_PURCHASES_STATE,
  reducers: {
    // abre una orden en el panel: queda marcada hasta que llegue su detalle
    openPurchase: (state, action: { payload: number }) => {
      state.detail = { id: action.payload, data: state.detail.id === action.payload ? state.detail.data : null, status: 'loading', error: null, requestId: null }
    },
    // tiempo real (purchase.created): la orden entra arriba de la lista cargada si es de la bodega en pantalla (o la lista es global); una repetida no se duplica
    purchaseCreatedFromEvent: (state, action: PayloadAction<Purchase>) => {
      const purchase = action.payload
      if (state.status !== 'succeeded') return
      if (state.warehouseId !== null && state.warehouseId !== purchase.warehouseId) return
      if (state.items.some((item) => item.id === purchase.id)) return
      state.items.unshift({ ...purchase, items: [] })
    },
    // tiempo real (purchase.status_changed): estado de la orden y, en el detalle abierto, lo recibido de cada renglón
    purchaseStatusFromEvent: (state, action: PayloadAction<{ id: number; to: PurchaseStatus; lines: { productId: number; received: number }[]; at: string }>) => {
      const { id, to, lines, at } = action.payload
      const apply = (purchase: Purchase): void => {
        purchase.status = to
        if (to === 'received' && !purchase.receivedAt) purchase.receivedAt = at
        for (const line of lines) {
          const item = purchase.items.find((it) => it.productId === line.productId)
          if (item) item.receivedQty = line.received
        }
      }
      const row = state.items.find((item) => item.id === id)
      if (row) apply(row)
      if (state.detail.data?.id === id) apply(state.detail.data)
    },
    // tiempo real (purchase.payment_recorded): lo que la caja ya pagó de la orden
    purchasePaymentFromEvent: (state, action: PayloadAction<{ purchaseId: number; paid: number }>) => {
      const row = state.items.find((item) => item.id === action.payload.purchaseId)
      if (row) row.paidTotal = action.payload.paid
      if (state.detail.data?.id === action.payload.purchaseId) state.detail.data.paidTotal = action.payload.paid
    },
    // tiempo real (supplier_catalog.imported): el catálogo abierto de ese proveedor se vuelve a pedir (las filas no viajan en el evento)
    supplierCatalogImportedFromEvent: (state, action: PayloadAction<number>) => {
      state.catalogTicks[action.payload] = (state.catalogTicks[action.payload] ?? 0) + 1
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
        // el evento purchase.created puede llegar antes que esta respuesta: no se duplica
        if (!state.items.some((item) => item.id === action.payload.id)) state.items.unshift({ ...action.payload, items: [] })
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

export const { openPurchase, purchaseCreatedFromEvent, purchaseStatusFromEvent, purchasePaymentFromEvent, supplierCatalogImportedFromEvent } = purchasesSlice.actions
export const purchasesReducer = purchasesSlice.reducer
