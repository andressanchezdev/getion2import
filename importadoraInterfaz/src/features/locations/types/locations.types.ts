// locations.types · contratos de las ubicaciones (estantes) de una bodega, lo que guarda cada una y el estado del slice
// conecta con: locations.adapter (convierte lo del backend), locations.service, locations.slice, locations.selectors y los componentes
import type { LoadStatus } from '@/api'

// ---- lo que usa la app ----
export interface WarehouseLocation {
  id: number
  warehouseId: number
  code: string // el que se imprime en el QR y se guarda en el stock
  description: string
  isActive: boolean
  productCount: number // productos distintos con existencias en esta ubicación
  units: number // unidades en esta ubicación
}

// un producto guardado en una ubicación
export interface LocationContentItem {
  stockId: number
  productId: number
  productCode: string
  productName: string
  brandName: string
  available: number
  reserved: number
  sellable: number
}

// lo que se manda al crear o editar una ubicación
export interface LocationInput {
  code: string
  description: string
}

// ---- lo que responde la API en Go ----
export interface LocationDto {
  id: number
  warehouseId: number
  code: string
  description?: string | null
  isActive: boolean
  productCount?: number
  units?: number
}

export interface LocationStockDto {
  stockId: number
  productId: number
  productCode: string
  productName: string
  brandName?: string | null
  available: number
  reserved: number
  sellable: number
}

// ---- estado del slice (no se guarda en el navegador) ----
export interface LocationsListState {
  warehouseId: number // la bodega de la que son las ubicaciones cargadas
  items: WarehouseLocation[]
  status: LoadStatus
  error: string | null
  saving: boolean // hay un cambio en curso (crear, editar o borrar)
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
}

export interface LocationContentState {
  key: string // «bodega|código» de la ubicación abierta
  items: LocationContentItem[]
  status: LoadStatus
  error: string | null
}

export interface LocationsState {
  list: LocationsListState
  content: LocationContentState
}
