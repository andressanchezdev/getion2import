// inventory.constants · tamaño de página, estado inicial y textos de las tablas de inventario
// conecta con: inventory.slice (initialState), inventory.thunks (tamaño de página) y las tablas
import type { InventoryState, StockLevel } from '../types/inventory.types'
import { DEFAULT_PAGE_SIZE } from '@/api'

export const INVENTORY_PAGE_SIZE = DEFAULT_PAGE_SIZE
export const INVENTORY_SEARCH_LIMIT = 100 // la búsqueda por texto de productos trae hasta 100 y se pagina en pantalla

const EMPTY_TABLE = { items: [], meta: null, status: 'idle' as const, error: null, requestId: null, page: 1, query: '' }

export const INITIAL_INVENTORY_STATE: InventoryState = {
  products: EMPTY_TABLE,
  stock: EMPTY_TABLE,
  productStock: { productId: null, items: [], status: 'idle', error: null, requestId: null },
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = { out: 'Agotado', low: 'Bajo', ok: 'Disponible' }

// filas de existencias que se piden de un producto (una por ubicación en cada bodega)
export const PRODUCT_STOCK_PAGE_SIZE = 100

// resultados que se muestran al elegir un producto del catálogo para asignarlo a una ubicación
export const CATALOG_SEARCH_LIMIT = 8

// IVA que se puede asignar a un producto: la tarifa del producto es el valor neto y el IVA se suma aparte al vender (0 = exento)
export const IVA_OPTIONS = [
  { value: 19, label: '19 %' },
  { value: 5, label: '5 %' },
  { value: 0, label: 'Exento (0 %)' },
]
export const DEFAULT_IVA = 19
