// locations.service · llamadas al backend de ubicaciones: listar (con lo que guarda cada una), ver su contenido, crear, editar, activar/desactivar y borrar
// conecta con: api/client y api/config (rutas), locations.adapter (convierte); las usa locations.thunks
// ojo: el contenido de una ubicación sale de GET /stock filtrado por bodega y ubicación; la API no deja borrar una ubicación con existencias
import { apiClient, API_CONFIG, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toContentItem, toLocation } from '../helpers/locations.adapter'
import type { LocationContentItem, LocationDto, LocationInput, LocationStockDto, WarehouseLocation } from '../types/locations.types'

const { WAREHOUSES, INVENTORY } = API_CONFIG.ENDPOINTS
const CONTENT_PAGE_SIZE = 200

// las ubicaciones de la bodega, con cuántos productos y unidades guarda cada una
export const fetchLocations = async (warehouseId: number): Promise<WarehouseLocation[]> => {
  const { data } = await apiClient.get<APIResponse<LocationDto[] | null>>(WAREHOUSES.LOCATIONS(warehouseId))
  return (data.data ?? []).map(toLocation)
}

// los productos que hay guardados en una ubicación
export const fetchLocationContent = async (ctx: RequestContext, warehouseId: number, code: string): Promise<LocationContentItem[]> => {
  const { data } = await apiClient.get<APIResponse<LocationStockDto[] | null>>(INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { warehouseId, location: code, page: 1, pageSize: CONTENT_PAGE_SIZE }),
  })
  return (data.data ?? []).filter((row) => row.available > 0 || row.reserved > 0).map(toContentItem)
}

// crea una ubicación en la bodega
export const createLocation = async (warehouseId: number, input: LocationInput): Promise<void> => {
  await apiClient.post(WAREHOUSES.LOCATIONS(warehouseId), { code: input.code.trim(), description: input.description.trim() || undefined })
}

// cambia el código o la descripción (si cambia el código, la API mueve también las existencias)
export const updateLocation = async (warehouseId: number, locationId: number, input: LocationInput): Promise<void> => {
  await apiClient.put(WAREHOUSES.LOCATION_BY_ID(warehouseId, locationId), { code: input.code.trim(), description: input.description.trim() })
}

// activa o desactiva una ubicación (una inactiva no recibe productos nuevos)
export const setLocationActive = async (warehouseId: number, locationId: number, isActive: boolean, reason?: string): Promise<void> => {
  await apiClient.put(WAREHOUSES.LOCATION_BY_ID(warehouseId, locationId), { isActive, reason })
}

// borra una ubicación vacía
export const deleteLocation = async (warehouseId: number, locationId: number, reason: string): Promise<void> => {
  await apiClient.delete(WAREHOUSES.LOCATION_BY_ID(warehouseId, locationId), { data: { reason } })
}
