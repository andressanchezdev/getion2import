// suppliers.constants · tamaño de página y estado inicial de proveedores
// conecta con: suppliers.thunks (cuántos pide) y suppliers.slice (initialState)
import type { SuppliersState } from '../types/suppliers.types'

export const SUPPLIERS_PAGE_SIZE = 30

export const INITIAL_SUPPLIERS_STATE: SuppliersState = {
  items: [],
  status: 'idle',
  error: null,
  meta: null,
  page: 1,
  query: '',
  requestId: null,
  summary: { data: null, status: 'idle', error: null },
}
