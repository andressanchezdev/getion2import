// inventory.service · llamadas al backend del control de inventario: POST /inventory/filter (paginado, por bodega) y POST /inventory/search (texto, hasta un máximo)
// conecta con: api/client, api/config y api/pagination (toPaginated), inventory.adapter (convierte); las usa inventory.thunks
// ojo: /inventory/control y /inventory/filter devuelven lo mismo (8.205 productos); se usa filter porque acepta warehouseId y hasStock. hasStock solo se manda cuando es true (en /products, hasStock=false significa "solo SIN stock" y se asume lo mismo aquí)
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toStockItem } from '../helpers/inventory.adapter'
import type { ControlItemDto, InventoryFilterBody } from '../types/inventory.api.types'
import type { StockItem } from '../types/inventory.types'

const { PRODUCTS } = API_CONFIG.ENDPOINTS

export interface InventoryQuery {
  page: number
  pageSize: number
  warehouseId?: number
  onlyInStock: boolean
}

export const buildFilterBody = (ctx: RequestContext, query: InventoryQuery): InventoryFilterBody => ({
  companyId: ctx.companyId,
  page: query.page,
  pageSize: query.pageSize,
  ...(query.warehouseId !== undefined && { warehouseId: query.warehouseId }),
  ...(query.onlyInStock && { hasStock: true }),
})

export const fetchInventoryPage = async (ctx: RequestContext, query: InventoryQuery): Promise<Paginated<StockItem>> => {
  const { data } = await apiClient.post<APIResponse<ControlItemDto[] | null>>(PRODUCTS.FILTER, buildFilterBody(ctx, query))
  const page = toPaginated(data)
  return { items: page.items.map((dto) => toStockItem(dto, query.warehouseId)), meta: page.meta }
}

export const searchInventory = async (ctx: RequestContext, text: string, limit: number, warehouseId?: number): Promise<StockItem[]> => {
  const { data } = await apiClient.post<APIResponse<ControlItemDto[] | null>>(PRODUCTS.SEARCH, {
    companyId: ctx.companyId,
    limit,
    query: text.trim(),
    type: 'product',
  })
  return (data.data ?? []).map((dto) => toStockItem(dto, warehouseId))
}
