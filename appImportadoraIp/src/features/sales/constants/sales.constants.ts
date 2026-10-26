// sales.constants · tamaño de página, textos y estado inicial de ventas
// conecta con: sales.thunks (cuántos pide), sales.slice (initialState) y las pantallas (textos)
import type { SalesListState, SalesState } from '../types/sales.types'

export const SALES_PAGE_SIZE = 30

export const NO_WAREHOUSE_MESSAGE = 'Elige una bodega para ver las ventas.'

// textos de los estados que manda el backend; los que no estén aquí se muestran tal cual
export const SALE_STATUS_LABELS: Record<string, string> = {
  verification: 'Verificación',
  picking: 'Alistamiento',
  invoicing: 'Facturación',
  pendiente: 'Pendiente',
  pending: 'Pendiente',
}

const emptyList = <T>(): SalesListState<T> => ({ items: [], status: 'idle', error: null, meta: null, page: 1, requestId: null })

export const INITIAL_SALES_STATE: SalesState = {
  history: emptyList(),
  pending: emptyList(),
}
