// realtime/index · API pública de la feature realtime (contrato v1, máquina de conexión, enrutador e indicador)
// conecta con: ErpLayout (useRealtime), AppHeader (RealtimeStatus), rootReducer (realtimeReducer) y app/store/realtimeRegistry
export * from './types/realtime.contract'
export type {
  RealtimeConnectionStatus,
  RealtimeState,
  RealtimeTicketResponse,
  RealtimeConnectionOptions,
  RealtimeConnection,
} from './types/realtime.types'
export * from './constants/realtime.constants'
export * from './services/realtime.ticket'
export * from './services/realtime.service'
export * from './helpers/realtime.adapter'
export * from './helpers/realtime.guards'
export * from './helpers/realtime.sequencer'
export * from './helpers/realtime.router'
export * from './helpers/realtime.backoff'
export * from './slices/realtime.slice'
export * from './thunks/realtime.thunks'
export * from './hooks/useRealtime'
export * from './hooks/useRealtimeStatus'
export * from './hooks/useRevalidateOnFocus'
export { RealtimeStatus } from './components/RealtimeStatus'
