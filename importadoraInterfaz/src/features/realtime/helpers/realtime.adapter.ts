// realtime.adapter · convierte el mensaje crudo del websocket en un RealtimeEvent (en inglés)
// conecta con: realtime.service (lo llama por cada mensaje); es el ÚNICO lugar que conoce la forma del mensaje del servidor
// ojo: importadora-online recibía { tipo, cuerpo, idCliente }; se aceptan esos nombres y los nuevos { type, body, customerId }
import type { RealtimeEvent } from '../types/realtime.types'

export const parseRealtimeMessage = (raw: unknown): RealtimeEvent | null => {
  if (typeof raw !== 'string') return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const type = data.type ?? data.tipo
    if (typeof type !== 'string') return null
    const customerId = data.customerId ?? data.idCliente
    return {
      type,
      body: data.body ?? data.cuerpo,
      customerId: typeof customerId === 'string' || typeof customerId === 'number' ? String(customerId) : undefined,
    }
  } catch {
    return null
  }
}
