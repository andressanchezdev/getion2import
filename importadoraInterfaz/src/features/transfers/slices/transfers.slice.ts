// transfers.slice · estado de traslados: lista de la bodega activa, existencias de la bodega, resultados del buscador y borrador de solicitud
// conecta con: transfers.thunks (lo llenan), transfers.selectors (lecturas) y rootReducer (clave 'transfers'; NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al saltar de compañía rootReducer lo reinicia
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { isNewer } from '@/global/helpers/realtime/applyVersioned'
import { INITIAL_TRANSFERS_STATE } from '../constants/transfers.constants'
import {
  acceptTransferThunk,
  createTransferRequestThunk,
  dispatchTransferThunk,
  loadTransfersThunk,
  loadWarehouseStockThunk,
  searchTransferProductsThunk,
} from '../thunks/transfers.thunks'
import type { TransferRequestLine, TransferStatus, TrasladeItem } from '../types/transfers.types'

// agrega la fila si no existe; si existe, la reemplaza solo cuando lo que llega es más nuevo
const upsertTransferRow = (items: TrasladeItem[], incoming: TrasladeItem) => {
  const idx = items.findIndex((item) => item.id === incoming.id)
  if (idx === -1) {
    items.unshift(incoming)
    return
  }
  if (isNewer(incoming.updatedAt, items[idx].updatedAt)) items[idx] = { ...items[idx], ...incoming }
}

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
        if (line.availableOrigins) {
          existing.availableOrigins = line.availableOrigins
        }
        if (existing.quantity < line.max) {
          existing.quantity += 1
        }
      } else {
        // Si el producto ya está en el borrador con otro origen pero el usuario lo vuelve a agregar desde catálogo
        const existingAnyOrigin = state.draft.lines.find((l) => l.productId === line.productId)
        if (existingAnyOrigin) {
          if (line.availableOrigins) {
            existingAnyOrigin.availableOrigins = line.availableOrigins
          }
          if (existingAnyOrigin.quantity < existingAnyOrigin.max) {
            existingAnyOrigin.quantity += 1
          }
        } else {
          state.draft.lines.push({ ...line, quantity: line.quantity || 1 })
        }
      }
    },
    setTransferDraftDest: (state, action: PayloadAction<number>) => {
      state.draft.destWarehouseId = action.payload
    },
    changeTransferDraftOrigin: (
      state,
      action: PayloadAction<{
        productId: number
        currentOriginWarehouseId: number
        newOriginWarehouseId: number
        newOriginWarehouseName: string
        newMax: number
      }>
    ) => {
      const { productId, currentOriginWarehouseId, newOriginWarehouseId, newOriginWarehouseName, newMax } = action.payload
      const target = state.draft.lines.find(
        (l) => l.productId === productId && l.originWarehouseId === currentOriginWarehouseId
      )
      if (target) {
        target.originWarehouseId = newOriginWarehouseId
        target.originWarehouseName = newOriginWarehouseName
        target.max = newMax
        target.quantity = Math.max(1, Math.min(newMax, target.quantity))
      }
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
    // tiempo real (transfer.created): agrega o actualiza el traslado si pertenece a la bodega activa (o si no hay filtro)
    transferUpsertedFromEvent: (
      state,
      action: PayloadAction<{ transfer: TrasladeItem; activeWarehouseId?: number }>
    ) => {
      const { transfer, activeWarehouseId } = action.payload
      if (
        activeWarehouseId &&
        transfer.originWarehouse.id !== activeWarehouseId &&
        transfer.destWarehouse.id !== activeWarehouseId
      ) {
        return
      }
      upsertTransferRow(state.list.items, transfer)
    },
    // tiempo real (transfer.status_changed): aplica estado, novedad, motivo y responsables a la fila que ya está en memoria (si no está, se ignora)
    transferStatusFromEvent: (
      state,
      action: PayloadAction<{
        transferId: number
        version: string
        to: TransferStatus
        lines: TrasladeItem['products']
        noveltyNotes: string | null
        cancelReason: string | null
        dispatchedBy: { id: number | null; name: string } | null
        receivedBy: { id: number | null; name: string } | null
      }>
    ) => {
      const { transferId, version, to, lines, noveltyNotes, cancelReason, dispatchedBy, receivedBy } = action.payload
      const row = state.list.items.find((item) => item.id === transferId)
      if (!row || !isNewer(version, row.updatedAt)) return
      row.status = to
      row.updatedAt = version
      if (lines.length > 0) row.products = lines
      row.noveltyNotes = noveltyNotes ?? row.noveltyNotes
      row.cancelReason = cancelReason ?? row.cancelReason
      if (dispatchedBy) {
        row.dispatchedByEmployeeId = dispatchedBy.id ?? undefined
        row.dispatchedByEmployeeName = dispatchedBy.name
      }
      if (receivedBy) {
        row.receivedByEmployeeId = receivedBy.id ?? undefined
        row.receivedByEmployeeName = receivedBy.name
      }
      if (to === 'with_novelty') row.priority = 'high'
    },
    // tiempo real (stock.changed): actualiza las existencias de la sede, el buscador multibodega y el tope del borrador
    warehouseStockFromEvent: (
      state,
      action: PayloadAction<{
        rows: Array<{
          stockId: number
          warehouseId: number
          productId: number
          location: string | null
          available: number
          reserved: number
          sellable: number
          minStock: number
          version: string
        }>
        totals: Array<{
          productId: number
          warehouseId: number
          available: number
          reserved: number
          sellable: number
        }>
      }>
    ) => {
      const { rows, totals } = action.payload
      // 1) pestaña «Repuestos en sede»
      for (const row of rows) {
        const existing = state.stock.items.find((item) => item.stockId === row.stockId)
        if (existing && isNewer(row.version, (existing as { updatedAt?: string }).updatedAt)) {
          existing.available = row.available
          existing.reserved = row.reserved
          existing.sellable = row.sellable
          existing.minStock = row.minStock
          if (row.location !== null) existing.location = row.location
          ;(existing as { updatedAt?: string }).updatedAt = row.version
        }
      }
      // 2) borrador de solicitud y buscador multibodega
      for (const total of totals) {
        for (const line of state.draft.lines) {
          if (line.productId === total.productId && line.originWarehouseId === total.warehouseId) {
            line.max = Math.max(0, total.sellable)
          }
          if (line.productId === total.productId && line.availableOrigins) {
            const origin = line.availableOrigins.find((o) => o.warehouseId === total.warehouseId)
            if (origin) origin.stock = Math.max(0, total.sellable)
          }
        }
        const matrix = state.search.items.find((item) => item.productId === total.productId)
        if (matrix) {
          const loc = matrix.locations.find((l) => l.warehouseId === total.warehouseId)
          if (loc) {
            loc.stock = total.available
            loc.reservedStock = total.reserved
            loc.availableStock = Math.max(0, total.sellable)
            matrix.totalStock = matrix.locations.reduce((sum, l) => sum + l.stock, 0)
            matrix.totalAvailable = matrix.locations.reduce((sum, l) => sum + l.availableStock, 0)
          }
        }
      }
    },
    // tiempo real (entity.status_changed): marca líneas del borrador cuando un producto o bodega pasa a inactivo
    transferEntityStatusFromEvent: (
      state,
      action: PayloadAction<{ kind: 'product' | 'warehouse'; id: number; to: string }>
    ) => {
      const { kind, id, to } = action.payload
      const unavailable = to !== 'active'
      if (kind === 'product') {
        for (const line of state.draft.lines) {
          if (line.productId === id) line.unavailable = unavailable
        }
        if (unavailable) {
          state.search.items = state.search.items.filter((item) => item.productId !== id)
        }
      } else if (kind === 'warehouse') {
        for (const line of state.draft.lines) {
          if (line.originWarehouseId === id) line.unavailable = unavailable
        }
      }
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
        const currentById = new Map(state.list.items.map((item) => [item.id, item]))
        state.list.items = action.payload.map((incoming) => {
          const existing = currentById.get(incoming.id)
          if (existing && existing.updatedAt && !isNewer(incoming.updatedAt, existing.updatedAt)) {
            return { ...incoming, ...existing }
          }
          return incoming
        })
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
      // la fila se actualiza al instante con la respuesta completa del servidor (sin GET de seguimiento)
      .addCase(createTransferRequestThunk.fulfilled, (state, action) => {
        for (const result of action.payload) {
          if (result.transfer) upsertTransferRow(state.list.items, result.transfer)
        }
      })
      .addCase(dispatchTransferThunk.fulfilled, (state, action) => {
        if (typeof action.payload === 'object' && action.payload !== null) {
          upsertTransferRow(state.list.items, action.payload)
          return
        }
        const row = state.list.items.find((item) => item.id === action.payload)
        if (row) row.status = 'in_transit'
      })
      .addCase(acceptTransferThunk.fulfilled, (state, action) => {
        if (action.payload.transfer) {
          upsertTransferRow(state.list.items, action.payload.transfer)
          return
        }
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
  changeTransferDraftOrigin,
  updateTransferDraftQuantity,
  removeTransferDraftLine,
  clearTransferDraft,
  transferUpsertedFromEvent,
  transferStatusFromEvent,
  warehouseStockFromEvent,
  transferEntityStatusFromEvent,
} = transfersSlice.actions

export const transfersReducer = transfersSlice.reducer
