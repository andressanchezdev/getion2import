// realtime.types · estado de la conexión del websocket (máquina 16.1), respuesta del ticket y opciones del servicio
// conecta con: realtime.service, realtime.slice, realtime.thunks y useRealtimeStatus
import type { ClientMessage, RealtimeEvent } from './realtime.contract'

export type RealtimeConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'replaying'
  | 'resyncing'
  | 'live'
  | 'reconnecting'
  | 'offline'

export type RealtimeStatus = RealtimeConnectionStatus

export interface RealtimeState {
  status: RealtimeStatus
  lastSeq: number | null
  connectedAt: number | null
  lastError: string | null
  replaying: boolean
}

export interface RealtimeTicketResponse {
  ticket: string
  wsUrl: string
  expiresAt: string
}

export interface RealtimeConnectionOptions {
  getLastSeq: () => number | null
  requestTicket?: () => Promise<RealtimeTicketResponse>
  fallbackWsUrl?: string
  createWebSocket?: (url: string) => WebSocket
  onStatus: (status: RealtimeStatus, error?: string | null) => void
  onEvent: (event: RealtimeEvent) => void
  onSessionRevoked: (reason: 'remote' | 'suspended') => void
  onResyncRequired: (currentSeq: number) => Promise<void> | void
}

export interface RealtimeConnection {
  close: () => void
  send: (message: ClientMessage) => void
}
