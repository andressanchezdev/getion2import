// auth.helpers · funciones puras del login: validar campos, armar el nombre y traducir errores
// conecta con: useLoginForm (validación), auth.thunks (mensaje de error), SideMenuUser (nombre)
import type { AppApiError } from '@/api'
import { LOGIN_MESSAGES } from '../constants/auth.constants'
import type { AuthUser } from '../types/auth.types'

// true si correo y contraseña tienen algo escrito
// ojo: el original solo avisaba si AMBOS estaban vacíos; ahora se piden los dos
export const hasLoginFields = (email: string, password: string): boolean => {
  return email.trim() !== '' && password.trim() !== ''
}

// nombre completo para mostrar en el menú
export const getDisplayName = (user: AuthUser): string => `${user.name} ${user.lastName}`.trim()

// convierte el error del cliente HTTP en un mensaje para el cliente
export const getLoginErrorMessage = (error: unknown): string => {
  const apiError = error as Partial<AppApiError>
  if (apiError.status === 400 || apiError.status === 401) return LOGIN_MESSAGES.invalidCredentials
  return apiError.userFriendlyMessage ?? LOGIN_MESSAGES.unknownError
}
