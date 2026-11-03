// errors · traduce cualquier error de axios (red, timeout o HTTP) a un AppApiError legible para el cliente
// conecta con: api/client (interceptores) y features/auth (mensaje de login); ojo: antes vivía dentro de client.ts
import type { AxiosError } from 'axios'
import type { AppApiError } from '../types/api.types'

/**
 * 4. Normalizador de Errores: Traduce cualquier fallo técnico a formato legible
 */
// ojo: antes el body del error era any; ahora es un tipo con lo que realmente leemos (message / error)
type ErrorBody = { message?: string; error?: string }

export function normalizeError(error: AxiosError<unknown>): AppApiError {
  // Caso 1: Error de red o timeout (el servidor no contestó)
  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED'
    return {
      status: 0,
      message: error.message || 'Error de conexión',
      userFriendlyMessage: isTimeout
        ? 'El servidor tardó demasiado en responder (Tiempo de espera agotado). Por favor intenta de nuevo.'
        : 'No fue posible conectar con el servidor de Importadora Premium. Verifica tu conexión a internet o el estado del backend.',
      details: error.code,
      timestamp: new Date().toISOString(),
    }
  }

  // Caso 2: El servidor respondió con código HTTP de error
  const { status } = error.response
  const data = error.response.data as ErrorBody | undefined
  const serverMessage = data?.message || data?.error || error.message

  let userFriendly = 'Ocurrió un error inesperado al procesar la solicitud.'

  switch (status) {
    case 400:
      userFriendly = serverMessage || 'Los datos enviados son inválidos. Por favor verifica los campos.'
      break
    case 401:
      userFriendly = 'Tu sesión ha expirado o no estás autorizado. Por favor ingresa de nuevo.'
      break
    case 403:
      userFriendly = 'No tienes permisos suficientes para realizar esta acción en el sistema.'
      break
    case 404:
      userFriendly = 'El recurso solicitado no fue encontrado en el servidor.'
      break
    case 500:
      // ojo: el servidor manda la causa en message; antes se tapaba con un texto fijo y no se sabía qué falló
      userFriendly = serverMessage ? `Error del servidor: ${serverMessage}` : 'Error interno del servidor. Revisa los registros del API.'
      break
    case 502:
    case 503:
    case 504:
      userFriendly = `El servidor no está disponible (${status}). Verifica que el API esté en línea y que VITE_API_BASE_URL apunte a él.`
      break
    default:
      userFriendly = serverMessage || userFriendly
  }

  return {
    status,
    message: serverMessage,
    userFriendlyMessage: userFriendly,
    details: data?.error || data,
    timestamp: new Date().toISOString(),
  }
}

// mensaje legible para el cliente a partir de cualquier error que llegue a un thunk (ya normalizado por el cliente HTTP o desconocido)
export const getErrorMessage = (error: unknown, fallback = 'No fue posible completar la operación. Intenta de nuevo.'): string => {
  const apiError = error as Partial<AppApiError> | null
  return apiError?.userFriendlyMessage ?? fallback
}

// arma un error de la app para una regla que se detecta en el front (por ejemplo "no hay stock"); getErrorMessage lo lee igual que a uno del servidor
export const createAppError = (message: string, status = 409): AppApiError => ({
  status,
  message,
  userFriendlyMessage: message,
  timestamp: new Date().toISOString(),
})
