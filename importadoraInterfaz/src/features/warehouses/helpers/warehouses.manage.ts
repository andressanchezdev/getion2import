// warehouses.manage · funciones puras de la pantalla de gestión de bodegas: filtrar la tabla y sugerir el código de una bodega nueva
// conecta con: useManagedWarehouses (filtra) y useWarehouseForm (sugiere el código); no toca el store
import type { Warehouse } from '../types/warehouse.types'

export type WarehouseStatusFilter = 'all' | 'active' | 'inactive'

// busca en nombre, código, ciudad, dirección y administrador (sin importar mayúsculas) y filtra por estado
export const filterWarehouses = (items: Warehouse[], query: string, status: WarehouseStatusFilter): Warehouse[] => {
    const needle = query.trim().toLowerCase()
    return items.filter((warehouse) => {
        if (status === 'active' && warehouse.isActive === false) return false
        if (status === 'inactive' && warehouse.isActive !== false) return false
        if (!needle) return true
        return [warehouse.name, warehouse.code, warehouse.city, warehouse.address, warehouse.managerName].some((text) => (text ?? '').toLowerCase().includes(needle))
    })
}

// el código que se propone para una bodega nueva: B-01, B-02... el siguiente al número más alto que ya existe
export const suggestWarehouseCode = (items: Warehouse[]): string => {
    const highest = items.reduce((max, warehouse) => {
        const match = /^B-?(\d+)$/i.exec(warehouse.code ?? '')
        return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `B-${String(highest + 1).padStart(2, '0')}`
}
