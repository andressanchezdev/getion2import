// management.constants · etapas del pedido, nombres de canales y estado inicial
// conecta con: management.adapter (etiquetas), management.slice (initialState) y PipelineScreen
// ojo: los canales (saleChannel) y las etapas (invoiceStatus) son los valores reales que aceptó /management/saleOrders; SUPUESTO a confirmar con el negocio: las traducciones de los canales (majority, immediate, corporate, minority, direct); sus nombres vienen del backend
import type { ManagementState, OrdersState, StageKey } from '../types/management.types'

export const STAGES: ReadonlyArray<{ key: StageKey; field: string; label: string }> = [
  { key: 'verification', field: 'Verification', label: 'Verificación' },
  { key: 'picking', field: 'Picking', label: 'Alistamiento' },
  { key: 'packing', field: 'Packing', label: 'Empaque' },
  { key: 'invoicing', field: 'Invoicing', label: 'Facturación' },
  { key: 'dispatch', field: 'Dispatch', label: 'Despacho' },
  { key: 'sent', field: 'Sent', label: 'Enviados' },
]

export const CHANNELS: ReadonlyArray<{ key: string; field: string; label: string }> = [
  { key: 'majority', field: 'ordersMajority', label: 'Mayorista' },
  { key: 'immediate', field: 'ordersImmediate', label: 'Inmediato' },
  { key: 'corporate', field: 'ordersCorporate', label: 'Corporativo' },
  { key: 'minority', field: 'ordersMinority', label: 'Minorista' },
  { key: 'direct', field: 'ordersDirect', label: 'Directo' },
]

export const EXTRAS: ReadonlyArray<{ key: string; field: string; label: string }> = [
  { key: 'withoutTaking', field: 'withoutTaking', label: 'Sin tomar' },
  { key: 'trasladeWithoutTaking', field: 'ordersTrasladeWithoutTaking', label: 'Traslados sin tomar' },
  { key: 'finalAssignment', field: 'ordersFinalAssignment', label: 'En asignación final' },
  { key: 'finalFinished', field: 'ordersFinalFinished', label: 'Asignación finalizada' },
  { key: 'directDispatch', field: 'ordersDirectDisptach', label: 'Despacho directo' },
]

export const ORDERS_PAGE_SIZE = 20

// la lista de pedidos solo existe para estas etapas: "Enviados" (Sent) no es un invoiceStatus que el backend acepte en /management/saleOrders
export const LISTABLE_STAGES: ReadonlyArray<StageKey> = ['verification', 'picking', 'packing', 'invoicing', 'dispatch']

export const INITIAL_ORDERS_STATE: OrdersState = { items: [], meta: null, page: 1, status: 'idle', error: null, requestId: null }

export const INITIAL_MANAGEMENT_STATE: ManagementState = { selected: 'verification', channel: null, orders: INITIAL_ORDERS_STATE, data: null, status: 'idle', error: null, requestId: null }

export const NO_WAREHOUSE_MANAGEMENT = 'Elige una bodega para ver los pedidos por etapa.'
