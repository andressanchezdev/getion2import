// realtime.types · contratos del tiempo real: estado de la conexión, evento recibido y conexión
// conecta con: realtime.service, realtime.adapter, realtime.handlers, realtime.slice y realtime.thunks
export type RealtimeStatus = 'disabled' | 'connecting' | 'open' | 'closed'

// evento ya normalizado (en inglés), venga como venga del servidor
export interface RealtimeEvent {
  type: string
  body: unknown
  customerId?: string
}

export interface RealtimeState {
  status: RealtimeStatus
  lastEventAt: number | null
}

export interface RealtimeConnectionOptions {
  url: string
  onEvent: (event: RealtimeEvent) => void
  onStatus: (status: RealtimeStatus) => void
}

export interface RealtimeConnection {
  close: () => void
  send: (message: unknown) => void
}
