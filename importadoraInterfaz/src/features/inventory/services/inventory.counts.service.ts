// inventory.counts.service.ts · capa de servicio HTTP para auditoría y conteos físicos de inventario
// conecta con: api/client, API_CONFIG (rutas stock.counts), inventory.counts.types
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type {
  CreateCountInput,
  InventoryCount,
  UpdateCountItemInput,
} from '../types/inventory.counts.types'

const { COUNTS } = API_CONFIG.ENDPOINTS

export interface FetchCountsParams {
  warehouseId?: number
  status?: string
  page?: number
  pageSize?: number
}

// Lista los conteos físicos con paginación y filtros
export const fetchCounts = async (
  params?: FetchCountsParams
): Promise<APIResponse<InventoryCount[]>> => {
  const { data } = await apiClient.get<APIResponse<InventoryCount[]>>(COUNTS.LIST, {
    params,
  })
  return data
}

// Obtiene el detalle completo de un conteo con sus items
export const fetchCountById = async (id: number): Promise<InventoryCount> => {
  const { data } = await apiClient.get<APIResponse<InventoryCount>>(COUNTS.BY_ID(id))
  return data.data
}

// Inicia un nuevo conteo físico para la bodega
export const createCount = async (input: CreateCountInput): Promise<InventoryCount> => {
  const { data } = await apiClient.post<APIResponse<InventoryCount>>(COUNTS.LIST, input)
  return data.data
}

// Actualiza las cantidades contadas en un conteo pendiente
export const updateCountItems = async (
  countId: number,
  items: UpdateCountItemInput[]
): Promise<void> => {
  await apiClient.put(COUNTS.ITEMS(countId), { items })
}

// Marca el conteo como verificado por el supervisor
export const verifyCount = async (countId: number): Promise<void> => {
  await apiClient.post(COUNTS.VERIFY(countId))
}

// Corrobora el conteo y aplica los ajustes automáticos al stock
export const corroborateCount = async (countId: number): Promise<void> => {
  await apiClient.post(COUNTS.CORROBORATE(countId))
}
