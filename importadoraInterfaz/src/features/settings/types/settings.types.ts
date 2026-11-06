// settings.types · contratos de la configuración: ficha de la empresa, cuenta del usuario, protector de pantalla y el estado de la vista (clave 'settings')
// conecta con: settings.service (HTTP), settings.slice (estado), settings.helpers (validaciones) y las pestañas de ajustes
// ojo: la empresa solo tiene los campos que guarda el backend (nombre, correo, teléfono, dirección, ciudad)
export interface CompanyProfile {
  id: number
  name: string
  email: string
  phone: string
  address: string
  city: string
}

export type CompanyInput = Omit<CompanyProfile, 'id'>

export interface ProfileInput {
  name: string
  email: string
}

export interface ScreensaverSettings {
  imageUrl: string
  isActive: boolean
}

export interface SettingsState {
  company: CompanyProfile | null
  companyLoading: boolean
  companySaving: boolean
  screensaverImage: string // vacío = no hay imagen configurada y el protector no se activa
  screensaverLoading: boolean
  screensaverSaving: boolean
}
