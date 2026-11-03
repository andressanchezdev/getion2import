// audit.types · modelos que usa la app en la auditoría: movimiento, filas de cambios y filtros
// conecta con: audit.adapter (los arma), audit.service, audit.slice (estado), useAuditLog, AuditScreen y sus componentes
import type { LoadStatus, PaginatorMetadata } from '@/api'

export interface AuditChangeRow {
  field: string
  before: string // vacío si el movimiento no guarda el valor anterior
  after: string
}

export interface AuditEntry {
  id: number
  companyId?: number
  actorLabel: string // «Administrador · Ana Pérez»
  entity: string // tal cual lo guarda la API (para filtrar y buscar el historial)
  entityLabel: string
  entityId?: number
  action: string
  actionLabel: string
  reason?: string
  changes: AuditChangeRow[]
  rawChanges: string // el JSON completo y formateado, para quien necesita ver todo
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface AuditFilters {
  entity: string // '' = todas las gestiones
  action: string // '' = todas las acciones
  entityId?: number // solo los movimientos de este registro (la API no lo filtra: se aplica sobre la página cargada)
}

// estado de la auditoría: filtros, página y la lista que llegó del backend (requestId descarta respuestas de pedidos anteriores)
export interface AuditState {
  filters: AuditFilters
  page: number
  list: {
    items: AuditEntry[]
    meta: PaginatorMetadata | null
    status: LoadStatus
    error: string | null
    requestId: string | null
  }
}
