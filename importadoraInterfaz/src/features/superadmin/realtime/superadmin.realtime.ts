// superadmin.realtime · manejadores en tiempo real de administradores: entity.status_changed
// conecta con: superadmin.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { adminStatusFromEvent } from '../slices/superadmin.slice'

export const superadminRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'admin') return
      dispatch(adminStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
}

