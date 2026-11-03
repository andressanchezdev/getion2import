// warehouses.constants · tamaño de página y estado inicial de las bodegas
// conecta con: warehouses.service (cuántas pide) y warehouses.slice (initialState)
// ojo: antes aquí estaba la lista fija WAREHOUSES con 'WH-01'; ahora las bodegas salen de GET /warehouses
import type { WarehousesState } from '../types/warehouse.types'

// una empresa no tiene decenas de bodegas: una sola página alcanza para el selector
export const WAREHOUSES_PAGE_SIZE = 100

export const INITIAL_WAREHOUSES_STATE: WarehousesState = {
    items: [],
    status: 'idle',
    error: null,
    managed: [],
    managedStatus: 'idle',
    managedError: null,
    saving: false,
    recent: null,
}

// cuánto tiempo la tabla deja marcada la bodega recién creada o actualizada
export const RECENT_BADGE_MS = 6000

export const WAREHOUSE_STATUS_OPTIONS = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Solo activas' },
    { value: 'inactive', label: 'Solo inactivas' },
]
