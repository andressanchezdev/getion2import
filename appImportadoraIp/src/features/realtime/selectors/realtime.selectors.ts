// realtime.selectors · lectura del estado del tiempo real
// conecta con: cualquier componente que quiera mostrar si la conexión está abierta
import type { RealtimeState } from '../types/realtime.types'

// forma mínima del state (así la feature no importa el store de app)
type RealtimeRootState = { realtime: RealtimeState }

export const selectRealtimeStatus = (state: RealtimeRootState) => state.realtime.status
