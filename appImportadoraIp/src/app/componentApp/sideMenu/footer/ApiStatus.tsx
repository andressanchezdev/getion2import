// ApiStatus · estado de la conexión con la API en el footer del menú (conectando, en línea con ms, o sin conexión)
// conecta con: global useApiHealth (consulta); ojo: antes este indicador estaba en el header
import React from 'react'
import { useApiHealth } from '@/global/hooks/useApiHealth'
import './ApiStatus.css'

export const ApiStatus: React.FC = () => {
    const { status, health } = useApiHealth()

    const label =
        status === 'checking'
            ? 'Conectando con la API…'
            : status === 'online'
              ? `API en línea · ${health?.latencyMs} ms`
              : 'API sin conexión'

    return (
        <div className={`side-menu-api side-menu-api-${status}`} role="status" title={health?.message}>
            <span className="side-menu-api-dot" />
            <span className="side-menu-api-text">{label}</span>
        </div>
    )
}

export default ApiStatus
