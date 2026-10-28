// ApiStatus · estado de la conexión con la API en el footer del menú (conectando, en línea con ms, o sin conexión)
// conecta con: global useApiHealth (consulta), SideMenu (le pasa si el menú está contraído); ojo: antes este indicador estaba en el header
// ojo: como en la maqueta es una línea de texto con un punto de color (ya no una pastilla con fondo); con el menú contraído no se muestra
import React from 'react'
import { useApiHealth } from '@/global/hooks/useApiHealth'
import './ApiStatus.css'

interface ApiStatusProps {
    isMini: boolean
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ isMini }) => {
    const { status, health } = useApiHealth()

    const label =
        status === 'checking'
            ? 'Conectando con la API…'
            : status === 'online'
              ? `API en línea · ${health?.latencyMs} ms`
              : 'API sin conexión'

    return (
        <div
            className={`side-menu-api side-menu-api-${status} ${isMini ? 'side-menu-api-mini' : ''}`}
            role="status"
            title={health?.message}
        >
            <span className="side-menu-api-dot" />
            <span className="side-menu-api-text">{label}</span>
        </div>
    )
}

export default ApiStatus
