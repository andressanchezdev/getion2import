// settings.service · llamadas al backend de configuración: la empresa (/companies/:id), la cuenta del usuario (/employees/:id) y el protector (/settings/screensaver)
// conecta con: api/client y api/config; las usan settings.thunks
// ojo: solo HTTP; cambiar nombre, correo o clave exige el permiso employees:edit en el backend
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { CompanyInput, CompanyProfile, ProfileInput, ScreensaverSettings } from '../types/settings.types'

const { COMPANIES, EMPLOYEES, SETTINGS } = API_CONFIG.ENDPOINTS

export const fetchCompany = async (companyId: number): Promise<CompanyProfile> => {
  const { data } = await apiClient.get<APIResponse<CompanyProfile>>(COMPANIES.BY_ID(companyId))
  return data.data!
}

export const updateCompany = async (companyId: number, input: CompanyInput): Promise<CompanyProfile> => {
  const { data } = await apiClient.put<APIResponse<CompanyProfile>>(COMPANIES.BY_ID(companyId), input)
  return data.data ?? { id: companyId, ...input }
}

export const updateProfile = async (userId: number, input: ProfileInput): Promise<void> => {
  await apiClient.put(EMPLOYEES.BY_ID(userId), input)
}

export const updatePassword = async (userId: number, password: string): Promise<void> => {
  await apiClient.put(EMPLOYEES.CREDENTIALS_OF(userId), { password })
}

export const fetchScreensaver = async (): Promise<ScreensaverSettings | null> => {
  const { data } = await apiClient.get<APIResponse<ScreensaverSettings | null>>(SETTINGS.SCREENSAVER)
  return data.data ?? null
}

export const saveScreensaver = async (imageUrl: string): Promise<void> => {
  await apiClient.post(SETTINGS.SCREENSAVER, { imageUrl, isActive: true })
}
