// customers.realtime · manejadores en tiempo real de clientes: entity.status_changed
// conecta con: customers.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { customerStatusFromEvent } from '../slices/customers.slice'

export const customersRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'customer') return
      dispatch(customerStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
}

