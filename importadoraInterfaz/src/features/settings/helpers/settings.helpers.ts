// settings.helpers · validaciones puras de la cuenta y de la imagen del protector
// conecta con: useSecurityForm y useScreensaverSettings; con pruebas en settings.helpers.test.ts
import { MAX_SCREENSAVER_FILE_BYTES, MIN_PASSWORD_LENGTH } from '../constants/settings.constants'

// devuelve el texto del problema, o null si la clave nueva y su confirmación están bien (vacía = no se cambia)
export const validateNewPassword = (password: string, confirmation: string): string | null => {
  if (!password) return null
  if (password !== confirmation) return 'La nueva contraseña y su confirmación no coinciden.'
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  return null
}

// devuelve el texto del problema, o null si el archivo sirve como imagen del protector
export const validateScreensaverFile = (file: { type: string; size: number }): string | null => {
  if (!file.type.startsWith('image/')) return 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP)'
  if (file.size > MAX_SCREENSAVER_FILE_BYTES) return 'La imagen no debe superar los 10MB'
  return null
}
