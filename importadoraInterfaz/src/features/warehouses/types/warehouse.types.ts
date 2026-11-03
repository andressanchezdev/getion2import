// warehouse.types · contratos de bodega (lo que usa la app, lo que responde el backend y el estado del slice)
// conecta con: warehouses.helpers (convierte), warehouses.service, warehouses.slice, WarehouseSelector y WarehouseMenu
import type { LoadStatus } from '@/api'

// lo que usa la app; el id va como texto porque la bodega activa se guarda así en el estado ui
export interface Warehouse {
    id: string
    name: string
    code?: string
    isDefault?: boolean // bodega principal (la API en Go no la marca: queda sin definir y se usa la primera)
    city?: string
    address?: string
    phone?: string
    description?: string
    managerEmployeeId?: number
    managerName?: string
    isActive?: boolean
    locationCount?: number // ubicaciones de la bodega (solo las trae la lista de gestión)
    skuCount?: number // productos distintos con existencias
}

// lo que responde GET /warehouses en la API en Go (WarehouseResponse)
export interface WarehouseDto {
    id: number
    companyId?: number
    code?: string
    name: string
    city?: string
    address?: string
    phone?: string
    description?: string
    managerEmployeeId?: number
    managerName?: string
    isActive?: boolean
    locationCount?: number
    skuCount?: number
}

export interface CreateWarehouseInput {
    code: string
    name: string
    city?: string
    address?: string
    phone?: string
    description?: string
    managerEmployeeId?: number
}

export interface UpdateWarehouseInput {
    code?: string
    name?: string
    city?: string
    address?: string
    phone?: string
    description?: string
    managerEmployeeId?: number
    isActive?: boolean
}

// a qué bodega se le acaba de dar de alta o se le guardaron cambios (la tabla lo marca un momento)
export interface RecentWarehouseChange {
    id: string
    kind: 'new' | 'updated'
}

export interface WarehousesState {
    items: Warehouse[] // las activas: las usan el selector de bodega y el resto de pantallas
    status: LoadStatus
    error: string | null
    managed: Warehouse[] // todas (también las inactivas) con sus totales: las usa la pantalla de gestión
    managedStatus: LoadStatus
    managedError: string | null
    saving: boolean // hay un cambio en curso (guardar o cambiar el estado)
    recent: RecentWarehouseChange | null
}
