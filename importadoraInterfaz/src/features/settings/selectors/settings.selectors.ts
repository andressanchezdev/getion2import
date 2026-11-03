// settings.selectors · lecturas simples del estado de configuración
// conecta con: los hooks useCompanyForm y useScreensaverSettings; leen state.settings
import type { SettingsState } from '../types/settings.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type SettingsRoot = { settings: SettingsState }

export const selectSettings = (state: SettingsRoot) => state.settings
// lee la ficha de la empresa (null mientras no se cargue)
export const selectCompany = (state: SettingsRoot) => state.settings.company
