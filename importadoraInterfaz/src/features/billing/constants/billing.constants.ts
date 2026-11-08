// billing.constants · nombres de las series y el estado inicial de facturación
// conecta con: billing.slice (initialState) y los componentes de facturación
import type { BillingState, DocSeriesType } from '../types/billing.types'

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
  config: null,
  series: [],
  settingsStatus: 'idle',
  settingsError: null,
  requestId: null,
  saving: false,
}
