// suppliers.service · llamadas al backend de proveedores: POST /suppliers/list (listado paginado con búsqueda) y GET /suppliers/summary (totales)
// conecta con: api/client, api/config y api/pagination (toPaginated), suppliers.adapter (convierte); las usa suppliers.thunks
// ojo: la búsqueda va al backend (campo search); sin texto no se manda
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toSupplier, toSuppliersSummary } from '../helpers/suppliers.adapter'
import type { SupplierDto, SuppliersSummaryDto } from '../types/suppliers.api.types'
import type { Supplier, SuppliersSummary } from '../types/suppliers.types'

const { SUPPLIERS } = API_CONFIG.ENDPOINTS

export const fetchSuppliersPage = async (ctx: RequestContext, page: number, pageSize: number, query: string): Promise<Paginated<Supplier>> => {
  const search = query.trim()
  const { data } = await apiClient.post<APIResponse<SupplierDto[] | null>>(SUPPLIERS.LIST, {
    companyId: ctx.companyId,
    page,
    pageSize,
    ...(search && { search }),
  })
  const result = toPaginated(data)
  return { items: result.items.map(toSupplier), meta: result.meta }
}

// ojo: GET /suppliers/summary exige companyId en la query (sin él responde 400 "companyId is required")
export const fetchSuppliersSummary = async (ctx: RequestContext): Promise<SuppliersSummary> => {
  const { data } = await apiClient.get<APIResponse<SuppliersSummaryDto | null>>(SUPPLIERS.SUMMARY, { params: { companyId: ctx.companyId } })
  return toSuppliersSummary(data.data ?? {})
}
