// purchases.constants · estados de la orden con su texto y color, tamaño de carga y estado inicial
// conecta con: purchases.slice (initialState), purchases.service (cuántas pide) y los componentes de compras
import type { PillTone } from '@/global/components/UI/atoms/Pill'
import type { PurchasesState, PurchaseStatus } from '../types/purchases.types'

// la API entrega hasta 100 por página; se pide de una vez y la tabla pagina en pantalla de 20 en 20
export const PURCHASES_LOAD_SIZE = 100

export const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; tone: PillTone }> = {
  draft: { label: 'Borrador', tone: 'gray' },
  ordered: { label: 'Pedida', tone: 'blue' },
  partial: { label: 'Recibida en parte', tone: 'amber' },
  received: { label: 'Recibida', tone: 'green' },
  voided: { label: 'Anulada', tone: 'gray' },
}

export const PURCHASE_STATUS_OPTIONS: Array<{ value: PurchaseStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'ordered', label: 'Pedidas' },
  { value: 'partial', label: 'Recibidas en parte' },
  { value: 'received', label: 'Recibidas' },
  { value: 'voided', label: 'Anuladas' },
]

export const IVA_DEFAULT = 19

export const INITIAL_PURCHASES_STATE: PurchasesState = {
  items: [],
  warehouseId: null,
  status: 'idle',
  error: null,
  requestId: null,
  saving: false,
  detail: { id: null, data: null, status: 'idle', error: null, requestId: null },
  suppliers: [],
}
