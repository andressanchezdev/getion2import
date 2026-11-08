// returns.constants · estado inicial de la vista de devoluciones y textos de las etiquetas
// conecta con: returns.slice (estado inicial) y ReturnRow (etiquetas de resolución y estado)
import type { ReturnsState } from '../types/returns.types'

export const RETURNS_PAGE_SIZE = 100

export const INITIAL_RETURNS_STATE: ReturnsState = {
  items: [],
  loading: false,
  error: null,
  warehouseId: null,
  status: 'all',
  query: '',
}

// resolución → texto de la insignia (refund solo llega de datos viejos)
export const RESOLUTION_LABELS: Record<string, { text: string }> = {
  exchange: { text: 'Producto a Cambio' },
  credit_balance: { text: 'Saldo a Favor' },
  refund: { text: 'Reembolso Dinero' },
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}
