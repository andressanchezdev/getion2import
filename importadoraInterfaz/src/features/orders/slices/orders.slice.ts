// orders.slice · estado de la vista de pedidos (clave 'orders'): etapa, canal, bodega y búsqueda elegidos, conteos, tabla y pedido abierto con su detalle
// conecta con: orders.thunks (la llenan), orders.selectors (lecturas), navigation (al cambiar de bodega se limpia) y rootReducer (clave 'orders'; NO se guarda en el navegador)
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { setActiveWarehouse } from '@/features/navigation'
import { logoutThunk } from '@/features/auth'
import { INITIAL_ORDERS_STATE } from '../constants/orders.constants'
import { advanceOrderThunk, cancelOrderThunk, loadOrderCountsThunk, loadOrderDetailThunk, loadOrdersThunk } from '../thunks/orders.thunks'
import { toOrderRow } from '../helpers/orders.adapter'
import type { SaleDto } from '../types/orders.api.types'
import type { OrderChannelFilter, OrderStageKey } from '../types/orders.types'

const mapToStageKey = (stage: string): OrderStageKey | null => {
  if (stage.startsWith('verification')) return 'verification'
  if (stage.startsWith('pick')) return 'picking'
  if (stage.startsWith('pack')) return 'packing'
  if (stage.startsWith('invoic')) return 'invoicing'
  if (stage.startsWith('dispatch')) return 'dispatch'
  return null
}

export const ordersSlice = createSlice({
  name: 'orders',
  initialState: INITIAL_ORDERS_STATE,
  reducers: {
    setOrderStage: (state, action: PayloadAction<OrderStageKey>) => {
      state.stage = action.payload
      state.openId = null
    },
    setOrderChannel: (state, action: PayloadAction<OrderChannelFilter>) => {
      state.channel = action.payload
      state.openId = null
    },
    setOrderQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    setOrderWarehouse: (state, action: PayloadAction<number | null>) => {
      state.selectedWarehouseId = action.payload
      state.openId = null
    },
    openOrder: (state, action: PayloadAction<number>) => {
      if (state.openId === action.payload && (state.detail.status === 'succeeded' || state.detail.status === 'loading')) return
      state.openId = action.payload
      state.detail = INITIAL_ORDERS_STATE.detail
    },
    closeOrder: (state) => {
      state.openId = null
      state.detail = INITIAL_ORDERS_STATE.detail
    },
    // tiempo real (sale.created): la fila llega con la forma del listado; un pedido que ya está en la tabla no se cuenta dos veces
    saleUpsertedFromEvent: (state, action: PayloadAction<Record<string, unknown>>) => {
      const sale = action.payload as unknown as SaleDto & { serial?: string }
      if (!sale || typeof sale.id !== 'number') return
      // con una bodega elegida en el filtro, los pedidos de otra bodega no entran a esta tabla ni a sus conteos
      if (state.selectedWarehouseId !== null && sale.warehouseId !== undefined && sale.warehouseId !== state.selectedWarehouseId) return
      const stageKey = mapToStageKey(sale.currentStage ?? 'verification') ?? 'verification'
      const existingIdx = state.list.items.findIndex((it) => it.id === sale.id)
      if (state.stage === stageKey) {
        const row = toOrderRow({ ...sale, serialCode: sale.serialCode ?? sale.serial ?? '' }, stageKey)
        if (existingIdx >= 0) state.list.items[existingIdx] = { ...state.list.items[existingIdx], ...row }
        else state.list.items.unshift(row)
      }
      if (state.counts && existingIdx < 0 && state.counts[stageKey] !== undefined) state.counts[stageKey] = state.counts[stageKey] + 1
    },
    saleStageChangedFromEvent: (state, action: PayloadAction<{
      entity: { id: number; version: string }
      serial: string
      from: string
      to: string
      status: string
      reason?: string | null
    }>) => {
      const { entity, to, status, from } = action.payload
      const itemIdx = state.list.items.findIndex((it) => it.id === entity.id)
      const toKey = mapToStageKey(to)
      if (itemIdx >= 0) {
        if (toKey === state.stage && status === 'open') {
          state.list.items[itemIdx].currentStage = to
          state.list.items[itemIdx].confirmed = to.endsWith('_ok')
        } else {
          state.list.items.splice(itemIdx, 1)
        }
      }
      if (state.openId === entity.id && state.detail.data) {
        if (status === 'cancelled') {
          state.detail.data.cancelled = true
          state.detail.data.status = 'cancelled'
        } else {
          state.detail.data.stage = to
          state.detail.data.status = status
          state.detail.data.updatedAt = entity.version
        }
      }
      if (state.counts) {
        const fromKey = mapToStageKey(from)
        if (fromKey && state.counts[fromKey] !== undefined && fromKey !== toKey) {
          state.counts[fromKey] = Math.max(0, state.counts[fromKey] - 1)
        }
        if (toKey && state.counts[toKey] !== undefined && status === 'open' && fromKey !== toKey) {
          state.counts[toKey] = state.counts[toKey] + 1
        }
      }
    },
    salePaymentChangedFromEvent: (state, action: PayloadAction<{
      saleId: number
      paidTotal: number
      creditAmount: number
      balance: number
      paymentVerified: boolean
    }>) => {
      const { saleId, paidTotal, creditAmount, paymentVerified } = action.payload
      const row = state.list.items.find((it) => it.id === saleId)
      if (row) {
        row.paidAmount = paidTotal
        row.creditAmount = creditAmount
        row.paymentVerified = paymentVerified
      }
      if (state.openId === saleId && state.detail.data) {
        state.detail.data.paymentVerified = paymentVerified
      }
    },
    invoiceIssuedFromEvent: (state, action: PayloadAction<{ invoice: { id: number; saleId: number; serial: string } }>) => {
      const { invoice } = action.payload
      if (state.openId === invoice.saleId && state.detail.data) {
        state.detail.data.stage = 'invoicing'
      }
    },
    invoiceAnnulledFromEvent: (state, action: PayloadAction<{ saleId: number }>) => {
      const { saleId } = action.payload
      if (state.openId === saleId && state.detail.data) {
        state.detail.data.status = 'invoice_annulled'
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrderCountsThunk.fulfilled, (state, action) => {
        state.counts = action.payload
      })
      .addCase(loadOrdersThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadOrdersThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return // respuesta de una petición anterior: se descarta
        state.list.items = action.payload.items
        state.list.capped = action.payload.capped
        state.list.status = 'succeeded'
      })
      .addCase(loadOrdersThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar los pedidos.'
      })
      .addCase(loadOrderDetailThunk.pending, (state, action) => {
        state.detail.status = 'loading'
        state.detail.error = null
        state.detail.requestId = action.meta.requestId
      })
      .addCase(loadOrderDetailThunk.fulfilled, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.data = action.payload
        state.detail.status = 'succeeded'
      })
      .addCase(loadOrderDetailThunk.rejected, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.status = 'failed'
        state.detail.error = action.payload ?? 'No se pudo cargar el detalle del pedido.'
      })
      // control de operaciones en proceso para evitar dobles ejecuciones por múltiples clics
      .addCase(advanceOrderThunk.pending, (state, action) => {
        const list = state.processingIds ?? []
        if (!list.includes(action.meta.arg.saleId)) {
          state.processingIds = [...list, action.meta.arg.saleId]
        }
      })
      .addCase(advanceOrderThunk.fulfilled, (state, action) => {
        state.processingIds = (state.processingIds ?? []).filter((id) => id !== action.meta.arg.saleId)
        state.list.items = state.list.items.filter((it) => it.id !== action.payload)
        if (state.openId === action.meta.arg.saleId) {
          state.detail = INITIAL_ORDERS_STATE.detail
        }
      })
      .addCase(advanceOrderThunk.rejected, (state, action) => {
        state.processingIds = (state.processingIds ?? []).filter((id) => id !== action.meta.arg.saleId)
      })
      .addCase(cancelOrderThunk.pending, (state, action) => {
        const list = state.processingIds ?? []
        if (!list.includes(action.meta.arg.saleId)) {
          state.processingIds = [...list, action.meta.arg.saleId]
        }
      })
      // un pedido anulado deja de estar en la tabla: si era el abierto, se cierra su detalle
      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        state.processingIds = (state.processingIds ?? []).filter((id) => id !== action.meta.arg.saleId)
        state.list.items = state.list.items.filter((it) => it.id !== action.payload)
        if (state.openId !== action.meta.arg.saleId) return
        state.openId = null
        state.detail = INITIAL_ORDERS_STATE.detail
      })
      .addCase(cancelOrderThunk.rejected, (state, action) => {
        state.processingIds = (state.processingIds ?? []).filter((id) => id !== action.meta.arg.saleId)
      })
      // otra bodega o cerrar sesión: se empieza de cero
      .addMatcher(isAnyOf(setActiveWarehouse, logoutThunk.fulfilled), () => INITIAL_ORDERS_STATE)
  },
})

export const {
  setOrderStage,
  setOrderChannel,
  setOrderQuery,
  setOrderWarehouse,
  openOrder,
  closeOrder,
  saleUpsertedFromEvent,
  saleStageChangedFromEvent,
  salePaymentChangedFromEvent,
  invoiceIssuedFromEvent,
  invoiceAnnulledFromEvent,
} = ordersSlice.actions
export const ordersReducer = ordersSlice.reducer
export default ordersSlice.reducer
