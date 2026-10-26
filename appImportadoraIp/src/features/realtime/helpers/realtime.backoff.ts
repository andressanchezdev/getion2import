// realtime.backoff · cuánto esperar antes de reconectar (crece al doble hasta un tope)
// conecta con: realtime.service (lo usa en cada reintento)
// ojo: importadora-online reintentaba siempre cada 5 segundos; así no se satura el servidor si está caído
import { RECONNECT_BASE_MS, RECONNECT_MAX_MS } from '../constants/realtime.constants'

// attempt = 0 para el primer reintento: 1s, 2s, 4s, 8s ... hasta 30s
export const getReconnectDelay = (attempt: number): number => {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)
}
