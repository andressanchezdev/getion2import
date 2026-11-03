// settings.constants · estado inicial de la configuración, campos de la ficha de la empresa y reglas de la clave y la imagen
// conecta con: settings.slice (estado inicial), CompanyTab (campos) y settings.helpers (límites)
import type { CompanyInput, SettingsState } from '../types/settings.types'

export const INITIAL_SETTINGS_STATE: SettingsState = {
  company: null,
  companyLoading: false,
  companySaving: false,
  screensaverImage: '',
  screensaverLoading: false,
  screensaverSaving: false,
}

export const MIN_PASSWORD_LENGTH = 6
export const MAX_SCREENSAVER_FILE_BYTES = 10 * 1024 * 1024

// campos que se muestran y editan de la empresa (los que el backend guarda)
export const COMPANY_FIELDS: Array<{ key: keyof CompanyInput; label: string; type: 'text' | 'email'; required: boolean }> = [
  { key: 'name', label: 'Razón Social / Nombre', type: 'text', required: true },
  { key: 'city', label: 'Ciudad', type: 'text', required: false },
  { key: 'address', label: 'Dirección Física', type: 'text', required: false },
  { key: 'phone', label: 'Teléfono de Contacto', type: 'text', required: false },
  { key: 'email', label: 'Correo Electrónico', type: 'email', required: false },
]
