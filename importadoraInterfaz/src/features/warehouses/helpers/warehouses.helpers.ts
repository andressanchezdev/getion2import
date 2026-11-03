// warehouses.helpers — convierte las bodegas del backend a las de la app y elige cuál queda activa
// conecta con: warehouses.service (toWarehouses) y WarehouseSelector (pickActiveWarehouse); funciones puras
import type { Warehouse, WarehouseDto } from '../types/warehouse.types'

// de una bodega del backend a la de la app: id como texto y valores seguros
export const toWarehouse = (row: WarehouseDto): Warehouse => ({
    id: String(row.id),
    name: (row.name ?? '').trim() || `Bodega #${row.id}`,
    code: row.code || undefined,
    city: row.city || undefined,
    address: row.address || undefined,
    phone: row.phone || undefined,
    description: row.description || undefined,
    managerEmployeeId: row.managerEmployeeId || undefined,
    managerName: row.managerName || undefined,
    isActive: row.isActive !== false,
    locationCount: row.locationCount ?? 0,
    skuCount: row.skuCount ?? 0,
})

// del backend a la app, solo las activas (para el selector de bodega)
export const toWarehouses = (rows: WarehouseDto[]): Warehouse[] => (rows ?? []).filter((row) => row.isActive !== false).map(toWarehouse)

// todas, activas e inactivas (para la pantalla de gestión)
export const toAllWarehouses = (rows: WarehouseDto[]): Warehouse[] => (rows ?? []).map(toWarehouse)

// elige la bodega activa cuando llega la lista:
// 1) si el usuario tiene bodega asignada y no es admin, se fuerza SIEMPRE la bodega del login
// 2) si es admin multisede, se conserva la que ya estaba activa si sigue existiendo
// 3) la bodega del usuario; 4) la principal; 5) la primera; sin bodegas, ninguna
export const pickActiveWarehouse = (
    warehouses: Warehouse[],
    currentId: string,
    userWarehouseId?: number,
    isAdmin: boolean = false
): Warehouse | null => {
    const activeOnly = warehouses.filter((wh) => wh.isActive !== false)
    if (activeOnly.length === 0) return null
    if (userWarehouseId !== undefined && !isAdmin) {
        const ofUser = activeOnly.find((wh) => wh.id === String(userWarehouseId))
        if (ofUser) return ofUser
    }
    const current = activeOnly.find((wh) => wh.id === currentId)
    if (current) return current
    const ofUser = userWarehouseId === undefined ? undefined : activeOnly.find((wh) => wh.id === String(userWarehouseId))
    return ofUser ?? activeOnly.find((wh) => wh.isDefault) ?? activeOnly[0]
}
