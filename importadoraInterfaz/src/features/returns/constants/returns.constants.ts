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

// resolución → texto e icono de la insignia (refund solo llega de datos viejos)
export const RESOLUTION_LABELS: Record<string, { icon: string; text: string }> = {
  exchange: { icon: '📦', text: 'Producto a Cambio' },
  credit_balance: { icon: '💳', text: 'Saldo a Favor' },
  refund: { icon: '💵', text: 'Reembolso Dinero' },
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}
