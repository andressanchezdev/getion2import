// orders.service · llamadas al backend de pedidos: POST /management (conteo por etapa), POST /management/saleOrders (lista de una etapa y un canal) y POST /management/saleId (detalle)
// conecta con: api/client, api/config y api/pagination, orders.adapter (convierte); las usan orders.thunks
// ojo: saleOrders pide etapa, canal y tipo de venta y SOLO devuelve filas con un canal que exista; por eso «todos los canales» son cinco llamadas juntas
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { ORDER_CHANNELS, ORDERS_PAGE_SIZE } from '../constants/orders.constants'
import { toOrderDetail, toOrderRow, toStageCounts } from '../helpers/orders.adapter'
import type { OrderCountsDto, OrderDetailDto, OrderListItemDto } from '../types/orders.api.types'
import type { OrderChannelFilter, OrderChannelKey, OrderDetail, OrderRow, OrderStageKey, StageCounts } from '../types/orders.types'

const { MANAGEMENT } = API_CONFIG.ENDPOINTS

// los contadores por etapa son del momento; «state» solo cambia el desglose por canal, que aquí no se usa
export const fetchOrderCounts = async (ctx: RequestContext, warehouseId: number): Promise<StageCounts> => {
  const { data } = await apiClient.post<APIResponse<OrderCountsDto | null>>(MANAGEMENT.GET_COMPANIES, {
    companyId: ctx.companyId,
    warehouseId,
    state: 'verification',
  })
  return toStageCounts(data.data ?? {})
}

// los pedidos de una etapa y un canal (primera página)
const fetchChannel = async (ctx: RequestContext, warehouseId: number, stage: OrderStageKey, channel: OrderChannelKey) => {
  const { data } = await apiClient.post<APIResponse<OrderListItemDto[] | null>>(MANAGEMENT.GET_SALE_ORDERS, {
    companyId: ctx.companyId,
    warehouseId,
    invoiceStatus: stage,
    saleChannel: channel,
    saleType: 'sale',
    page: 1,
    pageSize: ORDERS_PAGE_SIZE,
  })
  const page = toPaginated(data)
  return { rows: page.items.map((dto) => toOrderRow(dto, stage, channel)), capped: page.meta.hasNextPage }
}

export interface OrdersResult {
  items: OrderRow[]
  capped: boolean
}

// la tabla: un canal o los cinco juntos, del más reciente al más antiguo
export const fetchOrders = async (
  ctx: RequestContext,
  warehouseId: number,
  stage: OrderStageKey,
  channel: OrderChannelFilter
): Promise<OrdersResult> => {
  const channels = channel === 'all' ? ORDER_CHANNELS.map((item) => item.key) : [channel]
  const pages = await Promise.all(channels.map((key) => fetchChannel(ctx, warehouseId, stage, key)))
  const items = pages.flatMap((page) => page.rows).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
  return { items, capped: pages.some((page) => page.capped) }
}

export const fetchOrderDetail = async (ctx: RequestContext, warehouseId: number, saleId: number): Promise<OrderDetail> => {
  const { data } = await apiClient.post<APIResponse<OrderDetailDto>>(MANAGEMENT.GET_SALE_BY_ID, {
    companyId: ctx.companyId,
    warehouseId,
    saleId,
  })
  return toOrderDetail(data.data)
}
