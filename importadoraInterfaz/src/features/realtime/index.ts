// realtime/index · API pública de la feature realtime (tiempo real por websocket)
// conecta con: ErpLayout (useRealtime), rootReducer (reducer); pendiente: contrato real de eventos del backend (ver realtime.constants)
export * from './types/realtime.types'
export * from './constants/realtime.constants'
export * from './selectors/realtime.selectors'
export * from './slices/realtime.slice'
export * from './thunks/realtime.thunks'
export * from './hooks/useRealtime'
