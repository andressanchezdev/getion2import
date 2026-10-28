// warehouses.helpers · convierte las bodegas del backend a las de la app y elige cuál queda activa
// conecta con: warehouses.service (toWarehouses) y WarehouseSelector (pickActiveWarehouse); funciones puras
import type { Warehouse, WarehouseDto } from '../types/warehouse.types'

// del backend a la app: id como texto y las inactivas se descartan (no se pueden elegir como bodega de trabajo)
export const toWarehouses = (rows: WarehouseDto[]): Warehouse[] =>
    rows
        .filter((row) => row.isActive !== false)
        .map((row) => ({
            id: String(row.warehouseId),
            name: row.name.trim(),
            isDefault: row.isMain,
            address: row.address || undefined,
            isActive: row.isActive,
        }))

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
    if (warehouses.length === 0) return null
    if (userWarehouseId !== undefined && !isAdmin) {
        const ofUser = warehouses.find((wh) => wh.id === String(userWarehouseId))
        if (ofUser) return ofUser
    }
    const current = warehouses.find((wh) => wh.id === currentId)
    if (current) return current
    const ofUser = userWarehouseId === undefined ? undefined : warehouses.find((wh) => wh.id === String(userWarehouseId))
    return ofUser ?? warehouses.find((wh) => wh.isDefault) ?? warehouses[0]
}
