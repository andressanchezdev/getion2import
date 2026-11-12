// locations.realtime · manejadores en tiempo real de ubicaciones: entity.status_changed (ubicación) y stock.changed (contenido abierto)
// conecta con: locations.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { locationStatusFromEvent, locationStockFromEvent } from '../slices/locations.slice'

export const locationsRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'location') return
      dispatch(locationStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
  'stock.changed': [
    (event, { dispatch }) => {
      dispatch(locationStockFromEvent(event.data.rows))
    },
  ],
}

