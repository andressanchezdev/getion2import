// RealtimeStatus · punto discreto en el AppHeader con el estado de la conexión en tiempo real (sección 16.7)
// conecta con: useRealtimeStatus y AppHeader.tsx
import React from 'react'
import './RealtimeStatus.css'
import { useRealtimeStatus } from '../hooks/useRealtimeStatus'

export const RealtimeStatus: React.FC = () => {
  const { tone, label, status } = useRealtimeStatus()

  return (
    <span
      className={`realtime-status realtime-status--${tone}`}
      title={label}
      aria-label={label}
      data-status={status}
      role="status"
    >
      <span className="realtime-status-dot" aria-hidden="true" />
    </span>
  )
}

export default RealtimeStatus

