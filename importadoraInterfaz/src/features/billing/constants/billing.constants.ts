// billing.constants · textos de estados y tipos, y el estado inicial de facturación
// conecta con: billing.slice (initialState) y los componentes de facturación
import type { PillTone } from '@/global/components/UI/atoms/Pill'
import type { BillingState, DocSeriesType, InvoiceKind, InvoiceStatus } from '../types/billing.types'

// las facturas se piden de una vez (hasta 100) y la tabla las pagina en pantalla
export const INVOICES_LOAD_SIZE = 100

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: PillTone }> = {
  pending: { label: 'Pendiente', tone: 'amber' },
  issued: { label: 'Emitida', tone: 'green' },
  annulled: { label: 'Anulada', tone: 'gray' },
}

export const INVOICE_STATUS_OPTIONS: Array<{ value: InvoiceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'issued', label: 'Emitidas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'annulled', label: 'Anuladas' },
]

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  invoice: 'Factura Electrónica',
  credit_note: 'Nota Crédito',
  expense: 'Gasto de Caja',
}

// cómo se llama cada serie en pantalla
export const DOC_SERIES_LABELS: Record<DocSeriesType, string> = {
  sale: 'Pedidos',
  transfer: 'Traslados',
  quotation: 'Cotizaciones',
  purchase: 'Compras',
  payment: 'Pagos',
  invoice: 'Facturas',
}

export const INITIAL_BILLING_STATE: BillingState = {
  warehouseId: null,
  invoices: [],
  invoicesStatus: 'idle',
  invoicesError: null,
  config: null,
  series: [],
  settingsStatus: 'idle',
  settingsError: null,
  requestId: null,
  saving: false,
}
