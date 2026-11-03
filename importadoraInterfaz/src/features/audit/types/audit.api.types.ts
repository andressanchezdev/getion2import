// audit.api.types · lo que responde la API en Go en GET /audit-logs (AuditLogResponse), con los nombres del backend
// conecta con: audit.adapter (convierte a AuditEntry) y audit.service
// ojo: «changes» es JSON libre (cada gestión guarda lo que le sirve), por eso llega como unknown y el adaptador lo vuelve filas
export interface AuditLogDto {
  id: number
  companyId?: number | null
  actorType?: string
  actorId?: number | null
  actorName?: string
  entity: string
  entityId?: number | null
  action: string
  reason?: string | null
  changes?: unknown
  ipAddress?: string
  userAgent?: string
  createdAt: string
}
