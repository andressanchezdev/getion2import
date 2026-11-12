// companies.realtime · manejadores en tiempo real de compañías: entity.status_changed (lo ve el superadmin por el canal platform)
// conecta con: companies.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { companyStatusFromEvent } from '../slices/companies.slice'

export const companiesRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      if (entity.kind !== 'company') return
      dispatch(companyStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
    },
  ],
}

