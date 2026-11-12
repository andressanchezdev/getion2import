// realtime.constants · tiempos de espera, reintentos y códigos de cierre del websocket
// conecta con: realtime.service y realtime.backoff
import { REALTIME_CLOSE_CODES } from '../types/realtime.contract'

export const HELLO_TIMEOUT_MS = 5000 // tiempo máximo para recibir system.welcome tras abrir el socket
export const RECONNECT_BASE_MS = 1000 // primera espera al reconectar (1 s)
export const RECONNECT_MAX_MS = 30000 // la espera crece al doble en cada intento hasta este tope (30 s)
export const TICKET_RETRY_LIMIT = 3 // máximo de reintentos inmediatos ante 4001 (ticket inválido) antes de aplicar espera creciente

export { REALTIME_CLOSE_CODES }
