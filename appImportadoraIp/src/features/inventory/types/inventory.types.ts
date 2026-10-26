// inventory.types · tipos de la app para el control de inventario: una fila de producto con su existencia y el estado de la pantalla
// conecta con: inventory.adapter (los arma), inventory.slice (los guarda), inventory.selectors y ProductControlScreen
import type { LoadStatus, PaginatorMetadata } from '@/api'

export interface StockLocation {
  code: string
  stock: number
}

export interface StockItem {
  id: number
  code: string
  name: string // descripción o, si viene vacía, categoría y modelo
  brand: string
  category: string
  model: string
  isActive: boolean
  locations: StockLocation[] // ubicaciones de la bodega activa (o de todas si no hay bodega elegida)
  warehouseStock: number // existencia física en esas ubicaciones
  physicalTotal: number // existencia física en todas las bodegas
  reserved: number // en carritos, verificación, alistamiento y por facturar
  available: number // disponible para vender
  minStock: number
  lowStock: boolean // hay mínimo definido y la existencia lo alcanzó
}

export interface InventoryState {
  items: StockItem[]
  status: LoadStatus
  error: string | null
  meta: PaginatorMetadata | null // null en la búsqueda por texto (el backend no pagina)
  page: number
  query: string
  onlyInStock: boolean
  requestId: string | null
}
