// externals.realtime · manejadores en tiempo real de proveedores y transportadoras: entity.status_changed
// conecta con: externals.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { externalStatusFromEvent } from '../slices/externals.slice'

export const externalsRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'supplier' && entity.kind !== 'carrier') return
      dispatch(externalStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
}

