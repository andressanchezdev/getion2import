// audit.adapter · convierte los movimientos de auditoría de la API a lo que usa la app; es el único lugar que conoce los nombres del backend
// conecta con: audit.service (lo usa), audit.api.types, audit.types y audit.constants
// ojo: «changes» no tiene forma fija; se reconocen { campo: { before, after } } (también old/new y from/to), { before: {...}, after: {...} } y un objeto plano (solo valor nuevo)
import { AUDIT_ACTORS, AUDIT_ENTITIES } from '../constants/audit.constants'
import type { AuditLogDto } from '../types/audit.api.types'
import type { AuditChangeRow, AuditEntry } from '../types/audit.types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// convierte cualquier valor guardado en un cambio de auditoría en un texto legible (vacío si no hay valor)
export const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const PAIRS: Array<[string, string]> = [['before', 'after'], ['old', 'new'], ['from', 'to']]

// si el cambio viene como par «antes y después» devuelve ambos valores; si no, null
const pairOf = (value: unknown): [unknown, unknown] | null => {
  if (!isRecord(value)) return null
  for (const [from, to] of PAIRS) if (from in value || to in value) return [value[from], value[to]]
  return null
}

// convierte el JSON de cambios del movimiento en filas con campo, valor anterior y valor nuevo
export const toChangeRows = (changes: unknown): AuditChangeRow[] => {
  if (changes === null || changes === undefined || changes === '') return []
  if (!isRecord(changes)) return [{ field: 'valor', before: '', after: formatAuditValue(changes) }]

  // { before: {...}, after: {...} }: se une por campo
  if (isRecord(changes.before) && isRecord(changes.after)) {
    const before = changes.before
    const after = changes.after
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    return fields.map((field) => ({ field, before: formatAuditValue(before[field]), after: formatAuditValue(after[field]) }))
  }

  return Object.entries(changes).map(([field, value]) => {
    const pair = pairOf(value)
    return pair
      ? { field, before: formatAuditValue(pair[0]), after: formatAuditValue(pair[1]) }
      : { field, before: '', after: formatAuditValue(value) }
  })
}

// «TRANSFER_CREATED» -> «Transfer created»
export const humanizeAction = (action: string): string => {
  const text = action.replace(/_/g, ' ').toLowerCase().trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// convierte un movimiento de auditoría de la API en el que usa la app, con las etiquetas en español
export const toAuditEntry = (dto: AuditLogDto): AuditEntry => {
  const actor = AUDIT_ACTORS[dto.actorType ?? ''] ?? dto.actorType ?? 'Sistema'
  return {
    id: dto.id,
    companyId: dto.companyId ?? undefined,
    actorLabel: dto.actorName ? `${actor} · ${dto.actorName}` : actor,
    entity: dto.entity,
    entityLabel: AUDIT_ENTITIES[dto.entity] ?? dto.entity,
    entityId: dto.entityId ?? undefined,
    action: dto.action,
    actionLabel: humanizeAction(dto.action),
    reason: dto.reason ?? undefined,
    changes: toChangeRows(dto.changes),
    rawChanges: dto.changes === undefined || dto.changes === null ? '' : JSON.stringify(dto.changes, null, 2),
    ipAddress: dto.ipAddress ?? '',
    userAgent: dto.userAgent ?? '',
    createdAt: dto.createdAt,
  }
}
