// quotations.service · llamadas al backend de cotizaciones: POST /quotations (lista paginada, con filtro de estado) y GET /quotations/stats (totales)
// conecta con: api/client y api/config, quotations.adapter (convierte); las usa quotations.thunks
// ojo: la lista llega con su paginación dentro de data ({ data, page, totalRows, totalPages }); aquí se convierte al meta estándar. No se manda sellerId ni userId: juntos filtran por vendedor Y cliente y dejaban la lista vacía
import { apiClient, API_CONFIG, type APIResponse, type Paginated, type PaginatorMetadata } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toQuotation, toQuotationStats } from '../helpers/quotations.adapter'
import type { QuotationsPageDto, QuotationStatsDto } from '../types/quotations.api.types'
import type { Quotation, QuotationStats } from '../types/quotations.types'

const { QUOTATIONS } = API_CONFIG.ENDPOINTS

const toMeta = (page: QuotationsPageDto, requestedPage: number, pageSize: number): PaginatorMetadata => {
  const totalPages = page.totalPages ?? 0
  const current = page.page ?? requestedPage
  return { currentPage: current, pageSize: page.pageSize ?? pageSize, totalRecords: page.totalRows ?? 0, totalPages, hasNextPage: current < totalPages, hasPrevPage: current > 1 }
}

export const fetchQuotationsPage = async (ctx: RequestContext, page: number, pageSize: number, status: string): Promise<Paginated<Quotation>> => {
  const { data } = await apiClient.post<APIResponse<QuotationsPageDto | null>>(QUOTATIONS.LIST, {
    companyId: ctx.companyId,
    page,
    pageSize,
    ...(status && { status }),
  })
  const payload = data.data ?? {}
  return { items: (payload.data ?? []).map((row) => toQuotation(row)), meta: toMeta(payload, page, pageSize) }
}

export const fetchQuotationStats = async (): Promise<QuotationStats> => {
  const { data } = await apiClient.get<APIResponse<QuotationStatsDto | null>>(QUOTATIONS.STATS)
  return toQuotationStats(data.data ?? {})
}
