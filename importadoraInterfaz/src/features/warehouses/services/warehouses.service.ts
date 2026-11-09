// warehouses.service · llamadas al backend de bodegas: GET, POST, PUT, DELETE /warehouses
// conecta con: api/client, api/config y api/pagination (toPaginated), warehouses.helpers (convierte); la usan warehouses.thunks
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse } from '@/api'
import { WAREHOUSES_PAGE_SIZE } from '../constants/warehouses.constants'
import { toAllWarehouses, toWarehouse, toWarehouses } from '../helpers/warehouses.helpers'
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse, WarehouseDto } from '../types/warehouse.types'

const BASE = API_CONFIG.ENDPOINTS.WAREHOUSES.BASE

const getRows = async (companyId?: number): Promise<WarehouseDto[]> => {
    const { data } = await apiClient.get<APIResponse<WarehouseDto[] | null>>(BASE, {
        params: withCompany(companyId, { page: 1, pageSize: WAREHOUSES_PAGE_SIZE }),
    })
    return toPaginated(data).items
}

// las bodegas activas (selector de bodega)
export const fetchWarehouses = async (companyId?: number): Promise<Warehouse[]> => toWarehouses(await getRows(companyId))

// todas las bodegas, también las inactivas, con sus totales de ubicaciones y productos (pantalla de gestión)
export const fetchAllWarehouses = async (companyId?: number): Promise<Warehouse[]> => toAllWarehouses(await getRows(companyId))

export const createWarehouse = async (input: CreateWarehouseInput): Promise<Warehouse> => {
    const { data } = await apiClient.post<APIResponse<WarehouseDto>>(BASE, input)
    return toWarehouse(data.data!)
}

export const updateWarehouse = async (id: string | number, input: UpdateWarehouseInput): Promise<Warehouse> => {
    const { data } = await apiClient.put<APIResponse<WarehouseDto>>(`${BASE}/${id}`, input)
    return toWarehouse(data.data!)
}

// desactiva la bodega (el backend no la borra)
export const deleteWarehouse = async (id: string | number, reason: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`, { data: { reason } })
}
