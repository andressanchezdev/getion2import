// orders.actions · acciones que ofrece cada fila de la tabla de pedidos: la siguiente etapa, ver el detalle, copiar el número y anular
// conecta con: OrderRowActions (arma el menú), OrdersTable (ejecuta cada acción) y orders.thunks (advanceOrderThunk)
// ojo: la siguiente etapa sigue las mismas reglas que valida Go (sale_stage_rules): alistar desde «verificación confirmada», empacar desde alistamiento, facturar desde empaque, despachar desde facturación y enviar desde despacho
import type { OrderRow } from '../types/orders.types'

export type AdvanceActionKey = 'pick' | 'pack' | 'invoice' | 'dispatch' | 'send'
export type OrderActionKey = 'detail' | 'copy' | 'cancel' | AdvanceActionKey

export interface OrderAction {
  key: OrderActionKey
  label: string
  danger?: boolean
}

// etapa real del pedido → la acción que lo lleva a la siguiente
const NEXT_BY_STAGE: Record<string, OrderAction & { key: AdvanceActionKey }> = {
  verification_ok: { key: 'pick', label: 'Iniciar alistamiento' },
  picking: { key: 'pack', label: 'Pasar a empaque' },
  picking_ok: { key: 'pack', label: 'Pasar a empaque' },
  packing: { key: 'invoice', label: 'Facturar' },
  packing_ok: { key: 'invoice', label: 'Facturar' },
  invoicing: { key: 'dispatch', label: 'Despachar' },
  invoicing_ok: { key: 'dispatch', label: 'Despachar' },
  dispatch: { key: 'send', label: 'Marcar como enviado' },
}

// la acción para pasar a la siguiente etapa, o null si el pedido espera algo más (el pago en verificación) o ya terminó
export const nextStageAction = (order: OrderRow): (OrderAction & { key: AdvanceActionKey }) | null => NEXT_BY_STAGE[order.currentStage] ?? null

// siguiente etapa solo con permiso para editar; ver detalle y copiar siempre; anular solo con permiso (el backend tiene la última palabra)
export const getOrderActions = (order: OrderRow, canCancel: boolean, canAdvance = false): OrderAction[] => {
  const next = canAdvance ? nextStageAction(order) : null
  return [
    ...(next ? [next] : []),
    { key: 'detail', label: 'Ver detalle' },
    { key: 'copy', label: 'Copiar número del pedido' },
    ...(canCancel ? [{ key: 'cancel' as const, label: 'Anular con motivo…', danger: true }] : []),
  ]
}
