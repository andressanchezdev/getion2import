// useRealtimeStatus · lee el estado de la conexión en tiempo real para el indicador del AppHeader (sección 16.7)
// conecta con: realtime.slice y RealtimeStatus.tsx
import { useAppSelector } from '@/global/hooks/store/useRedux'
import type { RealtimeStatus } from '../types/realtime.types'

export type RealtimeVisualTone = 'green' | 'amber' | 'gray'

export interface RealtimeStatusView {
  status: RealtimeStatus
  tone: RealtimeVisualTone
  label: string
  replaying: boolean
}

export const getRealtimeStatusView = (status: RealtimeStatus, replaying = false): RealtimeStatusView => {
  if (status === 'live') {
    return {
      status,
      tone: 'green',
      label: 'Actualización en tiempo real activa',
      replaying,
    }
  }

  if (
    status === 'connecting' ||
    status === 'open' ||
    status === 'replaying' ||
    status === 'resyncing' ||
    status === 'reconnecting'
  ) {
    return {
      status,
      tone: 'amber',
      label: 'Reconectando… los datos pueden tardar en actualizarse',
      replaying,
    }
  }

  return {
    status,
    tone: 'gray',
    label: 'Sin tiempo real: los cambios de otros usuarios aparecerán al volver a esta pestaña',
    replaying,
  }
}

export const useRealtimeStatus = (): RealtimeStatusView => {
  const { status, replaying } = useAppSelector((state) => state.realtime)
  return getRealtimeStatusView(status, replaying)
}

