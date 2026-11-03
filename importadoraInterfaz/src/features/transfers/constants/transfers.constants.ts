// transfers.constants · textos y estilos de los estados de un traslado y tamaños de página
// conecta con: TransferItemsTable (insignia del estado) y transfers.service
import type { TransferFilters, TransferStatus, TransfersState } from '../types/transfers.types'

// la insignia usa las clases transfers-table-status-* de TransferItemsTable.css (neutra salvo aceptado, novedad y anulado, como en cotizaciones)
export const TRANSFER_STATUS_BADGE: Record<TransferStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'pending' },
  in_transit: { label: 'En tránsito', className: 'in-transit' },
  received: { label: 'Aceptado', className: 'received' },
  with_novelty: { label: 'Con novedad', className: 'novelty' },
  cancelled: { label: 'Anulado', className: 'cancelled' },
}

export const TRANSFERS_PAGE_SIZE = 50
// productos que se muestran al buscar en el modal de nuevo traslado
export const TRANSFER_SEARCH_LIMIT = 5

// existencias de la bodega que se piden de una vez en «Repuestos en sede»
export const WAREHOUSE_STOCK_PAGE_SIZE = 150
// espera antes de pedir al escribir en un buscador
export const TRANSFERS_SEARCH_DELAY_MS = 350

const emptyList = () => ({ items: [], status: 'idle' as const, error: null, requestId: null })
export const INITIAL_TRANSFERS_STATE: TransfersState = {
  list: emptyList(),
  stock: emptyList(),
  search: emptyList(),
  draft: { destWarehouseId: 0, lines: [] },
}

export const INITIAL_TRANSFER_FILTERS: TransferFilters = { query: '', type: 'all', direction: 'all', status: 'all' }

// opciones de los desplegables de la tabla de traslados
export const TRANSFER_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'inter_warehouse', label: 'Solicitud entre bodegas' },
  { value: 'relocation', label: 'Reubicación interna' },
  { value: 'central_dispatch', label: 'Despacho central' },
]
export const TRANSFER_DIRECTION_OPTIONS = [
  { value: 'all', label: 'Todas las rutas' },
  { value: 'incoming', label: 'Entrantes hacia esta sede' },
  { value: 'outgoing', label: 'Salientes desde esta sede' },
]
export const TRANSFER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_transit', label: 'En tránsito' },
  { value: 'received', label: 'Aceptado' },
  { value: 'novelty', label: 'Con novedad (prioritario)' },
]
