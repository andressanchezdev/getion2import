// orders.constants · etapas y canales de los pedidos, textos y estado inicial
// conecta con: orders.adapter (etiquetas), orders.slice (initialState), OrdersToolbar y OrdersTable
// ojo: las etapas (invoiceStatus) y los canales (saleChannel) son los valores reales que acepta /management/saleOrders; SUPUESTO a confirmar con el negocio: las traducciones de los canales
import type { OrderChannelKey, OrderStageKey, OrdersState } from '../types/orders.types'

export const ORDER_STAGES: ReadonlyArray<{ key: OrderStageKey; field: string; label: string }> = [
  { key: 'verification', field: 'Verification', label: 'Verificación' },
  { key: 'picking', field: 'Picking', label: 'Alistamiento' },
  { key: 'packing', field: 'Packing', label: 'Empaque' },
  { key: 'invoicing', field: 'Invoicing', label: 'Facturación' },
  { key: 'dispatch', field: 'Dispatch', label: 'Despacho' },
]

export const ORDER_CHANNELS: ReadonlyArray<{ key: OrderChannelKey; label: string }> = [
  { key: 'majority', label: 'Mayorista' },
  { key: 'immediate', label: 'Inmediato' },
  { key: 'corporate', label: 'Corporativo' },
  { key: 'minority', label: 'Minorista' },
  { key: 'direct', label: 'Directo' },
]

// textos de los métodos de pago que manda el backend; los que no estén aquí se muestran tal cual
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit: 'Crédito',
  favor: 'Saldo a favor',
}

// pedidos que se piden por canal en cada carga (el backend pagina por canal; «todos» junta los cinco)
export const ORDERS_PAGE_SIZE = 20

// mínimo de letras del motivo para anular un pedido
export const MIN_CANCEL_REASON = 5

export const NO_WAREHOUSE_ORDERS = 'Elige una bodega para ver los pedidos.'

export const INITIAL_ORDERS_STATE: OrdersState = {
  stage: 'verification',
  channel: 'all',
  query: '',
  counts: null,
  list: { items: [], status: 'idle', error: null, requestId: null, capped: false },
  openId: null,
  detail: { data: null, status: 'idle', error: null, requestId: null },
}
