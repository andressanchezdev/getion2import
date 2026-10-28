// client · instancia de axios con token Bearer y manejo de errores
// conecta con: api/config, api/types; lo usarán los services de cada feature
// src/api/client.ts
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_CONFIG } from './config'
import { normalizeError } from './errors'
import type { APIResponse, AppApiError } from './types/api.types'

// ojo: quien necesite reaccionar a un 401 (sesión vencida) registra su función aquí; así api/ no importa el store
let unauthorizedHandler: (() => void) | null = null
export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler
}

/**
 * 1. Instancia Base de Axios configurada para Importadora Premium (punto de entrada de la url de el swager de la api)
 * "VITE_API_BASE_URL esta en el .env"
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

/**
 * 2. Interceptor de Petición (Request Interceptor)
 * Inyecta automáticamente el token Bearer si existe en almacenamiento local
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
          : null

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // Entornos seguros o sin acceso a localStorage
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(normalizeError(error)
    )
  }
)

/**
 * 3. Interceptor de Respuesta (Response Interceptor)
 * Valida el envoltorio de la API y centraliza la captura de errores
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<APIResponse<unknown>>) => {
    // Si la API responde HTTP 200 pero el cuerpo indica fallo de negocio
    if (response.data && response.data.success === false) {
      const customError: AppApiError = {
        status: response.status,
        message: response.data.message || 'Error en la respuesta del servidor.',
        userFriendlyMessage:
          response.data.message || 'La operación no pudo ser completada por el servidor.',
        details: response.data.error,
        timestamp: new Date().toISOString(),
      }
      return Promise.reject(customError)
    }

    return response
  },
  (error: AxiosError<APIResponse<unknown>>) => {
    const normalized = normalizeError(error)

    // 401 en cualquier llamada menos las de la propia sesión: la sesión venció o el token no sirve
    // ojo: login, refresh y logout quedan fuera a propósito; si no, un fallo al renovar o al cerrar volvería a cerrar la sesión en bucle (ellos manejan su error)
    const { LOGIN, REFRESH, LOGOUT } = API_CONFIG.ENDPOINTS.AUTH
    const isSessionCall = [LOGIN, REFRESH, LOGOUT].some((url) => url === error.config?.url)
    if (normalized.status === 401 && !isSessionCall) {
      unauthorizedHandler?.()
    }

    return Promise.reject(normalized)
  }
)

export default apiClient
