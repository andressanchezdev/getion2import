// management.service · llamadas al backend de gestión de pedidos: POST /management (conteo por etapa y desglose por canal) y POST /management/saleOrders (lista de una etapa y un canal)
// conecta con: api/client y api/config, management.adapter (convierte); las usa management.thunks
// ojo: "state" se manda en minúscula (verification, picking...); no cambia los totales de las etapas, solo el desglose por canal de esa etapa
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toOrder, toPipeline } from '../helpers/management.adapter'
import type { ManagementCountsDto, ManagementOrderDto } from '../types/management.api.types'
import type { ManagementOrder, PipelineData, StageKey } from '../types/management.types'

export const fetchPipeline = async (ctx: RequestContext, warehouseId: number, state: StageKey): Promise<PipelineData> => {
  const { data } = await apiClient.post<APIResponse<ManagementCountsDto | null>>(API_CONFIG.ENDPOINTS.MANAGEMENT.COUNTS, {
    companyId: ctx.companyId,
    warehouseId,
    state,
  })
  return toPipeline(data.data ?? {})
}

// ojo: saleOrders pide los tres filtros (etapa, canal y tipo de venta) y SOLO devuelve filas con un canal que exista (majority, immediate, corporate, minority, direct): con un canal inventado responde 200 y lista vacía
export const fetchStageOrders = async (ctx: RequestContext, warehouseId: number, stage: StageKey, channel: string, page: number, pageSize: number): Promise<Paginated<ManagementOrder>> => {
  const { data } = await apiClient.post<APIResponse<ManagementOrderDto[] | null>>(API_CONFIG.ENDPOINTS.MANAGEMENT.SALE_ORDERS, {
    companyId: ctx.companyId,
    warehouseId,
    invoiceStatus: stage,
    saleChannel: channel,
    saleType: 'sale',
    page,
    pageSize,
  })
  const result = toPaginated(data)
  return { items: result.items.map(toOrder), meta: result.meta }
}
