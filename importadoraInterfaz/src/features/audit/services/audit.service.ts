// audit.service · llamada al backend de auditoría: GET /audit-logs (movimientos con quién, cuándo y qué cambió); solo lectura
// conecta con: api/client, api/config, api/params y api/pagination, audit.adapter (convierte); la usa useAuditLog
// ojo: la API toma la compañía del token (admin) o la que se mande en companyId (superadmin); sin compañía el superadmin ve todas
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse, type Paginated } from '@/api'
import type { RequestContext } from '@/features/auth'
import { AUDIT_PAGE_SIZE } from '../constants/audit.constants'
import { toAuditEntry } from '../helpers/audit.adapter'
import type { AuditLogDto } from '../types/audit.api.types'
import type { AuditEntry, AuditFilters } from '../types/audit.types'

export const fetchAuditPage = async (ctx: RequestContext, page: number, filters: AuditFilters): Promise<Paginated<AuditEntry>> => {
  const queryParams: Record<string, string | number> = {
    page,
    pageSize: AUDIT_PAGE_SIZE,
  }
  if (filters.entity) queryParams.entity = filters.entity
  if (filters.action) queryParams.action = filters.action
  if (filters.role) queryParams.actorType = filters.role
  if (filters.from) queryParams.from = filters.from
  if (filters.to) queryParams.to = filters.to

  const { data } = await apiClient.get<APIResponse<AuditLogDto[] | null>>(API_CONFIG.ENDPOINTS.AUDIT.LIST, {
    params: withCompany(ctx.companyId, queryParams),
  })
  const result = toPaginated(data)
  return { items: result.items.map(toAuditEntry), meta: result.meta }
}
