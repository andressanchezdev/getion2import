// quotations.constants · tamaño de página, estados con su texto y estado inicial de cotizaciones
// conecta con: quotations.adapter y QuotationsScreen (textos), quotations.thunks (cuántas pide) y quotations.slice (initialState)
// ojo: en la base de prueba solo se ven draft y sent; los demás nombres salen del Swagger y se muestran igual si llegan
import type { QuotationsState } from '../types/quotations.types'

export const QUOTATIONS_PAGE_SIZE = 20

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida',
}

// estados que se pueden filtrar (vacío = todas)
export const QUOTATION_FILTERS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Todas' },
  ...Object.entries(QUOTATION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

export const INITIAL_QUOTATIONS_STATE: QuotationsState = {
  items: [],
  meta: null,
  page: 1,
  statusFilter: '',
  status: 'idle',
  error: null,
  requestId: null,
  stats: { data: null, status: 'idle', error: null },
}
