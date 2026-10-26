// sales.service · llamadas al backend de ventas: POST /sales/history (historial) y POST /sales/pendings (carritos guardados del vendedor)
// conecta con: api/client, api/config y api/pagination (toPaginated), sales.adapter (convierte); las usa sales.thunks
// ojo: el historial pide companyId y warehouseId; los pendientes piden userId (el vendedor) y warehouseId y NO llevan companyId
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toPendingCart, toSaleRow } from '../helpers/sales.adapter'
import type { HistorySaleDto, PendingCartDto } from '../types/sales.api.types'
import type { PendingCart, SaleRow } from '../types/sales.types'

const { SALES } = API_CONFIG.ENDPOINTS

export const fetchSalesHistory = async (ctx: RequestContext, warehouseId: number, page: number, pageSize: number): Promise<Paginated<SaleRow>> => {
  const { data } = await apiClient.post<APIResponse<HistorySaleDto[] | null>>(SALES.HISTORY, {
    companyId: ctx.companyId,
    warehouseId,
    page,
    pageSize,
  })
  const result = toPaginated(data)
  return { items: result.items.map(toSaleRow), meta: result.meta }
}

export const fetchPendingCarts = async (ctx: RequestContext, warehouseId: number, page: number, pageSize: number): Promise<Paginated<PendingCart>> => {
  const { data } = await apiClient.post<APIResponse<PendingCartDto[] | null>>(SALES.PENDINGS, {
    userId: ctx.userId,
    warehouseId,
    page,
    pageSize,
  })
  const result = toPaginated(data)
  return { items: result.items.map(toPendingCart), meta: result.meta }
}
