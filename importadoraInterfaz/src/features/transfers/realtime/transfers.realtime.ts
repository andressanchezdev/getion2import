// transfers.realtime · manejadores en tiempo real de traslados: transfer.created, transfer.status_changed, stock.changed y entity.status_changed
// conecta con: transfers.slice, transfers.adapter, toast y realtimeRegistry
// ojo: transfer.status_changed no trae la fila completa: solo actualiza la que ya está en memoria; los avisos (toast) van a la bodega que no hizo la acción (16.8)
import { toast } from '@/global/helpers/feedback/toast'
import type { RealtimeHandlers } from '@/features/realtime'
import { toTransferFromEvent, toTransferStatus } from '../helpers/transfers.adapter'
import {
  transferEntityStatusFromEvent,
  transferStatusFromEvent,
  transferUpsertedFromEvent,
  warehouseStockFromEvent,
} from '../slices/transfers.slice'

type TransferRealtimeState = {
  auth?: { user?: { userId?: string | number; userType?: string; warehouseId?: number } | null }
  ui?: { activeWarehouseId?: string | null }
  warehouses?: { items?: Array<{ id: string | number; name: string }> }
}

const getActiveWarehouseId = (state: TransferRealtimeState): number | undefined => {
  const raw = state.ui?.activeWarehouseId ?? state.auth?.user?.warehouseId
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const warehouseNameOf = (state: TransferRealtimeState) => (id: number) =>
  state.warehouses?.items?.find((w) => Number(w.id) === id)?.name ?? `Bodega #${id}`

// el cambio lo hizo el mismo usuario que está en esta pestaña
const isOwnAction = (actor: { type: string; id: number | null }, state: TransferRealtimeState): boolean => {
  const user = state.auth?.user
  if (!user || actor.id === null) return false
  return Number(user.userId) === actor.id && (user.userType ?? '').toLowerCase() === actor.type.toLowerCase()
}

export const transfersRealtimeHandlers: RealtimeHandlers = {
  'transfer.created': [
    (event, { dispatch, getState }) => {
      const state = getState() as TransferRealtimeState
      const mapped = toTransferFromEvent(event.data.transfer, warehouseNameOf(state))
      const activeWh = getActiveWarehouseId(state)
      dispatch(transferUpsertedFromEvent({ transfer: mapped, activeWarehouseId: activeWh }))
      if (isOwnAction(event.actor, state) || !activeWh) return
      if (mapped.destWarehouse.id === activeWh) toast.info(`Solicitud de traslado ${mapped.serialCode} desde ${mapped.originWarehouse.name}`)
      else if (mapped.originWarehouse.id === activeWh) toast.info(`Nueva solicitud ${mapped.serialCode} hacia ${mapped.destWarehouse.name}`)
    },
  ],
  'transfer.status_changed': [
    (event, { dispatch, getState }) => {
      const state = getState() as TransferRealtimeState
      const d = event.data
      dispatch(
        transferStatusFromEvent({
          transferId: d.entity.id,
          version: d.entity.version,
          to: toTransferStatus(d.to),
          lines: d.lines.map((line) => ({
            itemId: line.lineId,
            productId: line.productId,
            code: line.productCode,
            description: line.productName || line.productCode,
            quantity: line.quantity,
            receivedQty: line.receivedQty,
            destinationLocation: line.destinationLocation ?? '',
          })),
          noveltyNotes: d.noveltyNotes,
          cancelReason: d.cancelReason,
          dispatchedBy: d.dispatchedBy,
          receivedBy: d.receivedBy,
        })
      )
      const activeWh = getActiveWarehouseId(state)
      if (isOwnAction(event.actor, state) || !activeWh) return
      const who = event.actor.name
      if (d.to === 'in_transit' && d.destinationWarehouseId === activeWh) toast.info(`${d.serial} va en camino a tu bodega`)
      else if (d.to === 'received' && d.originWarehouseId === activeWh) toast.info(`${d.serial} recibido por ${who}`)
      else if (d.to === 'with_novelty' && d.originWarehouseId === activeWh) toast.warning(`${d.serial} recibido con novedad por ${who}${d.noveltyNotes ? `: ${d.noveltyNotes}` : ''}`)
      else if (d.to === 'cancelled' && (d.originWarehouseId === activeWh || d.destinationWarehouseId === activeWh)) toast.warning(`${d.serial} cancelado por ${who}${d.cancelReason ? `: ${d.cancelReason}` : ''}`)
    },
  ],
  'stock.changed': [
    (event, { dispatch }) => {
      dispatch(warehouseStockFromEvent({ rows: event.data.rows, totals: event.data.totals }))
    },
  ],
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind === 'product' || entity.kind === 'warehouse') {
        dispatch(transferEntityStatusFromEvent({ kind: entity.kind, id: entity.id, to }))
      }
    },
  ],
}
