// health · prueba de conexión con el backend y latencia en ms
// conecta con: api/client y api/config (HEALTH.CHECK); lo usa global/hooks/useApiHealth para mostrar la latencia en el footer del menú
// src/api/health.ts
import { apiClient } from './client'
import { API_CONFIG } from './config'
import type { HealthCheckResult, AppApiError } from './types/api.types'

/**
 * Realiza una prueba de conexión (Handshake / Ping) contra el backend en Railway.
 * Mide latencia, verifica disponibilidad y genera el mensaje de confirmación oficial.
 */
export async function checkApiHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // ojo: antes se consultaba /swagger/doc.json (descargaba 781 KB cada vez); ahora GET /health (220 bytes)
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.HEALTH.CHECK, {
      timeout: 8000,
    })

    const latencyMs = Date.now() - startTime

    return {
      isConnected: true,
      latencyMs,
      statusCode: response.status,
      message: `Conexión establecida exitosamente con el backend de Importadora Premium en Railway (${latencyMs}ms).`,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const apiError = error as AppApiError

    return {
      isConnected: false,
      latencyMs,
      statusCode: apiError.status || 0,
      message: apiError.userFriendlyMessage || 'No se pudo conectar con el servidor en Railway.',
      errorDetails: apiError.message,
      timestamp: new Date().toISOString(),
    }
  }
}

export default checkApiHealth
