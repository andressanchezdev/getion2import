// inventory.service · llamadas al backend de stock: GET /stock y POST /stock/relocate
// conecta con: api/client, api/config, api/params y api/pagination, inventory.adapter (convierte); la usa inventory.thunks y RelocateStockPanel
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { INVENTORY_PAGE_SIZE, PRODUCT_STOCK_PAGE_SIZE } from '../constants/inventory.constants'
import { toInventoryStockRow } from '../helpers/inventory.adapter'
import type { StockFullDto } from '../types/inventory.api.types'
import type { InventoryStockRow } from '../types/inventory.types'

export const fetchStockPage = async (ctx: RequestContext, warehouseId: number, page: number, query: string, location = ''): Promise<Paginated<InventoryStockRow>> => {
  const { data } = await apiClient.get<APIResponse<StockFullDto[] | null>>(API_CONFIG.ENDPOINTS.INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { warehouseId, q: query.trim(), page, pageSize: INVENTORY_PAGE_SIZE, ...(location ? { location } : {}) }),
  })
  const result = toPaginated(data)
  return { items: result.items.map(toInventoryStockRow), meta: result.meta }
}

// existencias de un producto en todas las bodegas (una fila por ubicación)
export const fetchProductStock = async (ctx: RequestContext, productId: number): Promise<StockFullDto[]> => {
  const { data } = await apiClient.get<APIResponse<StockFullDto[] | null>>(API_CONFIG.ENDPOINTS.INVENTORY.STOCK, {
    params: withCompany(ctx.companyId, { productId, page: 1, pageSize: PRODUCT_STOCK_PAGE_SIZE }),
  })
  return data.data ?? []
}

export interface RelocateStockPayload {
  originStockId: number
  destinationLocation: string
  quantity: number
  reason?: string
}

// mueve existencias a otra ubicación de la misma bodega (POST /stock/relocate)
export const relocateStock = async (payload: RelocateStockPayload): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.INVENTORY.RELOCATE, payload)
}

export interface AssignStockPayload {
  productId: number
  warehouseId: number
  location: string
  quantity: number
  reason?: string
}

// pone un producto del catálogo en una ubicación activa de la bodega con unidades iniciales (POST /stock/assign)
export const assignStock = async (payload: AssignStockPayload): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.INVENTORY.ASSIGN, payload)
}
