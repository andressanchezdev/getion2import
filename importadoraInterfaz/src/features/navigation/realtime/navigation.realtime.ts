// navigation.realtime · si la bodega activa del usuario se desactiva, se vacía para que el selector elija otra activa
// conecta con: navigation.slice y realtimeRegistry
import type { RealtimeHandlers } from '@/features/realtime'
import { activeWarehouseDeactivated } from '../slices/navigation.slice'

export const navigationRealtimeHandlers: RealtimeHandlers = {
    'entity.status_changed': [
        (event, { dispatch }) => {
            const { entity, to } = event.data
            if (entity.kind !== 'warehouse' || to === 'active') return
            dispatch(activeWarehouseDeactivated(String(entity.id)))
        },
    ],
}

