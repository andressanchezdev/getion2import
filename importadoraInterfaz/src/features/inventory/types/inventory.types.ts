// inventory.types · modelos de las tablas de inventario: existencia por bodega y estado del slice (productos y stock)
// conecta con: inventory.adapter (arma las filas), inventory.slice, inventory.selectors y las pantallas de inventario
import type { LoadStatus, PaginatorMetadata } from '@/api'
import type { StockFullDto } from './inventory.api.types'
import type { Product } from '@/features/shop'

export type StockLevel = 'out' | 'low' | 'ok'

export interface InventoryStockRow {
  id: number
  productId: number
  productCode: string
  productName: string
  category: string
  brand: string
  location: string
  available: number // físico
  reserved: number // comprometido en pedidos y traslados que aún no descuentan
  sellable: number // lo que realmente se puede vender (físico menos reservado)
  minStock: number
  level: StockLevel
  version?: string // versión (ISO) de la última actualización recibida por tiempo real
}

interface TableState<T> {
  items: T[]
  meta: PaginatorMetadata | null
  status: LoadStatus
  error: string | null
  requestId: string | null
  page: number
  query: string
}

// existencias de UN producto en todas las bodegas (las que muestran el detalle y las ubicaciones del producto)
export interface ProductStockState {
  productId: number | null
  items: StockFullDto[]
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export interface InventoryState {
  products: TableState<Product>
  stock: TableState<InventoryStockRow>
  productStock: ProductStockState
  countEvent: CountRealtimeEvent | null // último evento count.* recibido: useInventoryCounts lo aplica a su lista y a su detalle
}

// un evento count.* tal como lo necesita la pantalla de conteos; n sube con cada evento para que el hook lo note aunque sea igual al anterior
export type CountRealtimeEvent =
  | { n: number; kind: 'created'; count: import('./inventory.counts.types').InventoryCount }
  | { n: number; kind: 'progress'; countId: number; items: { stockId: number; countedQty: number | null }[]; by: string }
  | { n: number; kind: 'status'; countId: number; to: import('./inventory.counts.types').CountStatus; at: string }
