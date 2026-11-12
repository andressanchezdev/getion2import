// warehouses.realtime · manejadores en tiempo real de bodegas: entity.status_changed de la bodega (selector y tabla de gestión)
// conecta con: warehouses.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { warehouseStatusFromEvent } from '../slices/warehouses.slice'

export const warehousesRealtimeHandlers: RealtimeHandlers = {
    'entity.status_changed': [
        (event, { dispatch }) => {
            const { entity, to } = event.data
            if (entity.kind !== 'warehouse') return
            dispatch(warehouseStatusFromEvent({ id: entity.id, isActive: to === 'active', version: entity.version }))
        },
    ],
}

