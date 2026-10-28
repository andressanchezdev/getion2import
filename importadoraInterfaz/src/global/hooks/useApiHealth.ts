// useApiHealth · consulta una vez la salud del backend y devuelve el estado (conectando, en línea o fuera de línea) con la latencia
// conecta con: api/health (checkApiHealth); lo usa ApiStatus en el footer del menú
// ojo: antes esta consulta estaba dentro de AppHeader y escribía en consola; ahora es un hook sin logs
import { useEffect, useState } from 'react'
import { checkApiHealth, type HealthCheckResult } from '@/api'

export type ApiStatusKind = 'checking' | 'online' | 'offline'

export const useApiHealth = () => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null)

  useEffect(() => {
    let mounted = true
    checkApiHealth()
      .then((result) => {
        if (mounted) setHealth(result)
      })
      .catch(() => {
        // checkApiHealth no lanza error (devuelve isConnected: false); por si acaso se marca fuera de línea
        if (mounted) setHealth({ isConnected: false, latencyMs: 0, message: 'Error al consultar el backend', timestamp: new Date().toISOString() })
      })
    return () => {
      mounted = false
    }
  }, [])

  const status: ApiStatusKind = health === null ? 'checking' : health.isConnected ? 'online' : 'offline'
  return { status, health }
}
