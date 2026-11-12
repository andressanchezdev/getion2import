// returns.realtime · manejadores en tiempo real de devoluciones: return.created y return.status_changed
// conecta con: returns.slice y realtimeRegistry
// ojo: el stock que reingresa y el saldo a favor llegan por sus propios eventos (stock.changed y credit.balance_changed)
import type { RealtimeHandlers } from '@/features/realtime'
import { returnCreatedFromEvent, returnStatusFromEvent } from '../slices/returns.slice'
import type { ReturnDto, ReturnStatus } from '../types/returns.types'

export const returnsRealtimeHandlers: RealtimeHandlers = {
  'return.created': [
    (event, { dispatch }) => {
      const dto = event.data.return as unknown as ReturnDto
      if (typeof dto?.id === 'number') dispatch(returnCreatedFromEvent(dto))
    },
  ],
  'return.status_changed': [
    (event, { dispatch }) => {
      dispatch(returnStatusFromEvent({ id: event.data.entity.id, to: event.data.to as ReturnStatus, by: event.actor.name }))
    },
  ],
}
