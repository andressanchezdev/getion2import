// orders.realtime · manejadores en tiempo real de ventas y pedidos: sale.created, sale.stage_changed, sale.payment_changed, invoice.issued, invoice.annulled
// conecta con: orders.slice, toast y realtimeRegistry
// ojo: actualiza la tabla de pedidos y conteos sin recargas HTTP (sección 12.4 del plan)
import { toast } from '@/global/helpers/feedback/toast'
import type { RealtimeHandlers } from '@/features/realtime'
import {
  invoiceAnnulledFromEvent,
  invoiceIssuedFromEvent,
  salePaymentChangedFromEvent,
  saleStageChangedFromEvent,
  saleUpsertedFromEvent,
} from '../slices/orders.slice'

type OrdersRealtimeState = {
  auth?: { user?: { userId?: string | number; userType?: string; warehouseId?: number } | null }
  ui?: { activeWarehouseId?: string | null }
}

const isOwnAction = (actor: { type: string; id: number | null }, state: OrdersRealtimeState): boolean => {
  const user = state.auth?.user
  if (!user || actor.id === null) return false
  return Number(user.userId) === actor.id && (user.userType ?? '').toLowerCase() === actor.type.toLowerCase()
}

export const ordersRealtimeHandlers: RealtimeHandlers = {
  'sale.created': [
    (event, { dispatch, getState }) => {
      dispatch(saleUpsertedFromEvent(event.data.sale))
      const state = getState() as OrdersRealtimeState
      if (!isOwnAction(event.actor, state)) {
        const serial = event.data.sale?.serial ?? 'Nuevo pedido'
        toast.info(`Nuevo pedido recibido: ${serial}`)
      }
    },
  ],
  'sale.stage_changed': [
    (event, { dispatch, getState }) => {
      dispatch(saleStageChangedFromEvent(event.data))
      const state = getState() as OrdersRealtimeState
      if (!isOwnAction(event.actor, state)) {
        const { serial, to } = event.data
        if (to === 'cancelled') {
          toast.warning(`Pedido ${serial} fue cancelado`)
        } else {
          toast.info(`Pedido ${serial} avanzó a etapa ${to}`)
        }
      }
    },
  ],
  'sale.payment_changed': [
    (event, { dispatch }) => {
      dispatch(salePaymentChangedFromEvent(event.data))
    },
  ],
  'invoice.issued': [
    (event, { dispatch, getState }) => {
      dispatch(invoiceIssuedFromEvent(event.data))
      const state = getState() as OrdersRealtimeState
      if (!isOwnAction(event.actor, state)) {
        toast.info(`Factura ${event.data.invoice.serial} emitida para el pedido`)
      }
    },
  ],
  'invoice.annulled': [
    (event, { dispatch, getState }) => {
      dispatch(invoiceAnnulledFromEvent(event.data))
      const state = getState() as OrdersRealtimeState
      if (!isOwnAction(event.actor, state)) {
        toast.warning(`Factura anulada: ${event.data.reason}`)
      }
    },
  ],
}

