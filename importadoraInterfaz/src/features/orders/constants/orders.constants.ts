// orders.constants · etapas y canales de los pedidos, textos y estado inicial
// conecta con: orders.adapter (etiquetas), orders.slice (initialState), OrdersToolbar y OrdersTable
// ojo: las etapas son las de currentStage de la API en Go; flujo logístico estándar
import type { OrderChannelKey, OrderStageKey, OrdersState } from '../types/orders.types'

export const ORDER_STAGES: ReadonlyArray<{ key: OrderStageKey; label: string }> = [
  { key: 'verification', label: 'Verificación' },
  { key: 'picking', label: 'Picking' },
  { key: 'packing', label: 'Packing' },
  { key: 'invoicing', label: 'Facturación' },
  { key: 'dispatch', label: 'Despacho' },
]

// canales de pedido soportados por la API
export const ORDER_CHANNELS: ReadonlyArray<{ key: OrderChannelKey; label: string }> = [
  { key: 'standard', label: 'Normal' },
  { key: 'immediate', label: 'Picking inmediato' },
]

// textos de los métodos de pago que manda el backend; los que no estén aquí se muestran tal cual
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit: 'Crédito',
  favor: 'Saldo a favor',
}

// pedidos que se piden de una etapa en cada carga (los más recientes)
export const ORDERS_PAGE_SIZE = 50

// mínimo de letras del motivo para anular un pedido
export const MIN_CANCEL_REASON = 5

export const INITIAL_ORDERS_STATE: OrdersState = {
  stage: 'verification',
  channel: 'all',
  query: '',
  selectedWarehouseId: null,
  counts: null,
  list: { items: [], status: 'idle', error: null, requestId: null, capped: false },
  openId: null,
  detail: { data: null, status: 'idle', error: null, requestId: null },
  processingIds: [],
}

// textos de las etapas del historial
export const STAGE_ENTRY_LABELS: Record<string, string> = {
  verification: 'Verificación',
  verification_ok: 'Verificación confirmada',
  picking: 'Picking',
  picking_ok: 'Picking terminado',
  packing: 'Packing',
  packing_ok: 'Packing terminado',
  invoicing: 'Facturación',
  invoicing_ok: 'Facturación terminada',
  dispatch: 'Despacho',
  sent: 'Enviado',
  cancelled: 'Anulado',
}

// textos del estado de un pago
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  review: 'En revisión',
  verified: 'Verificado',
  issue: 'Con novedad',
  voided: 'Anulado',
}
