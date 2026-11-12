// employees.realtime · manejadores en tiempo real de empleados y roles: entity.status_changed
// conecta con: employees.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { employeeStatusFromEvent, roleStatusFromEvent } from '../slices/employees.slice'

export const employeesRealtimeHandlers: RealtimeHandlers = {
  'entity.status_changed': [
    (event, { dispatch }) => {
      const { entity, to } = event.data
      const isActive = to === 'active'
      if (entity.kind === 'employee') dispatch(employeeStatusFromEvent({ id: entity.id, isActive, version: entity.version }))
      else if (entity.kind === 'role') dispatch(roleStatusFromEvent({ id: entity.id, isActive, version: entity.version }))
    },
  ],
}

