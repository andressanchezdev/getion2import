// warehouse.types · contratos de bodega (lo que usa la app, lo que responde el backend y el estado del slice)
// conecta con: warehouses.helpers (convierte), warehouses.service, warehouses.slice, WarehouseSelector y WarehouseMenu
import type { LoadStatus } from '@/api'

// lo que usa la app; el id va como texto porque la bodega activa se guarda así en el estado ui
export interface Warehouse {
    id: string
    name: string
    code?: string
    isDefault?: boolean // bodega principal (isMain en el backend)
    address?: string
    isActive?: boolean
}

// lo que responde POST /warehouses (Swagger: models.WarehouseResponse); las series de facturación se usarán al integrar ventas
export interface WarehouseDto {
    warehouseId: number
    name: string
    address?: string
    isMain?: boolean
    isActive?: boolean
    electronicBillingSerial?: number
    remissionSerial?: number
    saleSerial?: number
    transferSerial?: number
}

export interface WarehousesState {
    items: Warehouse[]
    status: LoadStatus
    error: string | null
}
