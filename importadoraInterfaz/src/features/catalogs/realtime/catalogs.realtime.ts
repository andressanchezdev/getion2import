// catalogs.realtime · manejadores en tiempo real de marcas, categorías y modelos: entity.status_changed
// conecta con: catalogs.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { catalogStatusFromEvent } from '../slices/catalogs.slice'

export const catalogsRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'brand' && entity.kind !== 'category' && entity.kind !== 'model') return
      dispatch(catalogStatusFromEvent({ kind: entity.kind, id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
}

