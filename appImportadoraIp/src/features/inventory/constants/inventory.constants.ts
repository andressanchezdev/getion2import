// inventory.constants · tamaños de página y estado inicial del control de inventario
// conecta con: inventory.thunks (cuántos pide) y inventory.slice (initialState)
import type { InventoryState } from '../types/inventory.types'

export const INVENTORY_PAGE_SIZE = 30
export const INVENTORY_SEARCH_LIMIT = 50 // la búsqueda por texto no pagina: devuelve hasta este número de productos

export const INITIAL_INVENTORY_STATE: InventoryState = {
  items: [],
  status: 'idle',
  error: null,
  meta: null,
  page: 1,
  query: '',
  onlyInStock: false,
  requestId: null,
}
