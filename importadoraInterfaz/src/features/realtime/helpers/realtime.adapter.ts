// realtime.adapter · convierte el texto o JSON crudo del websocket en un RealtimeEvent validado contra el contrato v1
// conecta con: realtime.contract (lista de 48 tipos y sobre) y realtime.service (lo llama en cada mensaje)
import {
  REALTIME_EVENT_TYPE_LIST,
  type ActorKind,
  type RealtimeEvent,
} from '../types/realtime.contract'

const VALID_TYPES = new Set<string>(REALTIME_EVENT_TYPE_LIST)
const VALID_ACTOR_KINDS = new Set<ActorKind>(['employee', 'admin', 'superadmin', 'system'])

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseEnvelope = (raw: unknown): RealtimeEvent | null => {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn('[realtime] JSON inválido descartado', error)
      }
      return null
    }
  }

  if (!isPlainObject(parsed)) return null

  if (parsed.v !== 1) return null
  if (typeof parsed.type !== 'string' || !VALID_TYPES.has(parsed.type)) return null
  if (typeof parsed.seq !== 'number' || !Number.isInteger(parsed.seq) || parsed.seq < 0) return null
  if (typeof parsed.id !== 'string' || parsed.id.length === 0) return null
  if (typeof parsed.occurredAt !== 'string' || parsed.occurredAt.length === 0) return null
  if (parsed.companyId !== null && (typeof parsed.companyId !== 'number' || !Number.isInteger(parsed.companyId))) {
    return null
  }
  if (
    !Array.isArray(parsed.warehouseIds) ||
    !parsed.warehouseIds.every((id) => typeof id === 'number' && Number.isInteger(id))
  ) {
    return null
  }

  const actor = parsed.actor
  if (!isPlainObject(actor)) return null
  if (typeof actor.type !== 'string' || !VALID_ACTOR_KINDS.has(actor.type as ActorKind)) return null
  if (actor.id !== null && (typeof actor.id !== 'number' || !Number.isInteger(actor.id))) return null
  if (typeof actor.name !== 'string') return null

  if (!isPlainObject(parsed.data)) return null

  return parsed as unknown as RealtimeEvent
}

export const parseRealtimeMessage = parseEnvelope
