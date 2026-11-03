// transfers.slice · estado de traslados: lista de la bodega activa, existencias de la bodega, resultados del buscador y borrador de solicitud
// conecta con: transfers.thunks (lo llenan), transfers.selectors (lecturas) y rootReducer (clave 'transfers'; NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al saltar de compañía rootReducer lo reinicia
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_TRANSFERS_STATE } from '../constants/transfers.constants'
import { acceptTransferThunk, dispatchTransferThunk, loadTransfersThunk, loadWarehouseStockThunk, searchTransferProductsThunk } from '../thunks/transfers.thunks'
import type { TransferRequestLine } from '../types/transfers.types'

export const transfersSlice = createSlice({
  name: 'transfers',
  initialState: INITIAL_TRANSFERS_STATE,
  reducers: {
    addTransferDraftLine: (
      state,
      action: PayloadAction<{ line: TransferRequestLine; destWarehouseId?: number }>
    ) => {
      const { line, destWarehouseId } = action.payload
      if (destWarehouseId && (!state.draft.destWarehouseId || state.draft.destWarehouseId === 0)) {
        state.draft.destWarehouseId = destWarehouseId
      }
      const existing = state.draft.lines.find(
        (l) => l.productId === line.productId && l.originWarehouseId === line.originWarehouseId
      )
      if (existing) {
        if (existing.quantity < line.max) {
          existing.quantity += 1
        }
      } else {
        state.draft.lines.push({ ...line, quantity: line.quantity || 1 })
      }
    },
    setTransferDraftDest: (state, action: PayloadAction<number>) => {
      state.draft.destWarehouseId = action.payload
    },
    updateTransferDraftQuantity: (
      state,
      action: PayloadAction<{ line: TransferRequestLine; quantity: number }>
    ) => {
      const { line, quantity } = action.payload
      const target = state.draft.lines.find(
        (l) => l.productId === line.productId && l.originWarehouseId === line.originWarehouseId
      )
      if (target) {
        target.quantity = Math.max(1, Math.min(line.max, quantity))
      }
    },
    removeTransferDraftLine: (state, action: PayloadAction<TransferRequestLine>) => {
      const target = action.payload
      state.draft.lines = state.draft.lines.filter(
        (l) => !(l.productId === target.productId && l.originWarehouseId === target.originWarehouseId)
      )
    },
    clearTransferDraft: (state) => {
      state.draft.lines = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransfersThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadTransfersThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload
        state.list.status = 'succeeded'
      })
      .addCase(loadTransfersThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar los traslados.'
      })
      .addCase(loadWarehouseStockThunk.pending, (state, action) => {
        state.stock.status = 'loading'
        state.stock.error = null
        state.stock.requestId = action.meta.requestId
      })
      .addCase(loadWarehouseStockThunk.fulfilled, (state, action) => {
        if (state.stock.requestId !== action.meta.requestId) return
        state.stock.items = action.payload
        state.stock.status = 'succeeded'
      })
      .addCase(loadWarehouseStockThunk.rejected, (state, action) => {
        if (state.stock.requestId !== action.meta.requestId) return
        state.stock.items = []
        state.stock.status = 'failed'
        state.stock.error = action.payload ?? 'No se pudieron cargar las existencias de la bodega.'
      })
      .addCase(searchTransferProductsThunk.pending, (state, action) => {
        state.search.status = 'loading'
        state.search.requestId = action.meta.requestId
      })
      .addCase(searchTransferProductsThunk.fulfilled, (state, action) => {
        if (state.search.requestId !== action.meta.requestId) return
        state.search.items = action.payload
        state.search.status = 'succeeded'
      })
      .addCase(searchTransferProductsThunk.rejected, (state, action) => {
        if (state.search.requestId !== action.meta.requestId) return
        state.search.items = []
        state.search.status = 'failed'
        state.search.error = action.payload ?? 'No se pudieron buscar los productos.'
      })
      // la fila cambia de estado al instante; al cerrar el panel la lista se vuelve a pedir
      .addCase(dispatchTransferThunk.fulfilled, (state, action) => {
        const row = state.list.items.find((item) => item.id === action.payload)
        if (row) row.status = 'in_transit'
      })
      .addCase(acceptTransferThunk.fulfilled, (state, action) => {
        const row = state.list.items.find((item) => item.id === action.payload.id)
        if (!row) return
        row.status = action.payload.noveltyNotes ? 'with_novelty' : 'received'
        if (action.payload.noveltyNotes) row.noveltyNotes = action.payload.noveltyNotes
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_TRANSFERS_STATE)
  },
})

export const {
  addTransferDraftLine,
  setTransferDraftDest,
  updateTransferDraftQuantity,
  removeTransferDraftLine,
  clearTransferDraft,
} = transfersSlice.actions

export const transfersReducer = transfersSlice.reducer
