// quotations.constants · estado inicial, tamaño de página y textos de los estados de una cotización
// conecta con: quotations.slice (initialState), quotations.selectors (página) y la tabla de cotizaciones
import type { QuotationFilters, QuotationsState, QuotationStatus } from '../types/quotations.types'

export const QUOTATIONS_PAGE_SIZE = 20

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida en venta',
}

export const INITIAL_QUOTATION_FILTERS: QuotationFilters = { search: '', from: '', to: '' }

export const INITIAL_QUOTATIONS_STATE: QuotationsState = {
  list: { items: [], status: 'idle', error: null, page: 1, requestId: null },
  filters: INITIAL_QUOTATION_FILTERS,
  detail: { id: null, data: null, status: 'idle', error: null },
}
