// settings.service · llamadas al backend de configuración: la empresa (/companies/:id), la cuenta propia (/auth/me) y el protector (/settings/screensaver)
// conecta con: api/client y api/config, auth.service; las usan settings.thunks
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { updateMeRequest, updatePasswordRequest, type AuthUser } from '@/features/auth'
import type { CompanyInput, CompanyProfile, ProfileInput, ScreensaverSettings } from '../types/settings.types'

const { COMPANIES, SETTINGS } = API_CONFIG.ENDPOINTS

export const fetchCompany = async (companyId: number): Promise<CompanyProfile> => {
  const { data } = await apiClient.get<APIResponse<CompanyProfile>>(COMPANIES.BY_ID(companyId))
  return data.data!
}

export const updateCompany = async (companyId: number, input: CompanyInput): Promise<CompanyProfile> => {
  const { data } = await apiClient.put<APIResponse<CompanyProfile>>(COMPANIES.BY_ID(companyId), input)
  return data.data ?? { id: companyId, ...input }
}

export const updateProfile = async (input: ProfileInput): Promise<AuthUser> => {
  const parts = input.name.trim().split(/\s+/)
  const firstName = parts[0] || input.name
  const lastName = parts.slice(1).join(' ')
  return await updateMeRequest({
    firstName,
    lastName,
    email: input.email,
  })
}

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await updatePasswordRequest(currentPassword, newPassword)
}

export const fetchScreensaver = async (): Promise<ScreensaverSettings | null> => {
  const { data } = await apiClient.get<APIResponse<ScreensaverSettings | null>>(SETTINGS.SCREENSAVER)
  return data.data ?? null
}

export const saveScreensaver = async (imageUrl: string): Promise<void> => {
  await apiClient.post(SETTINGS.SCREENSAVER, { imageUrl, isActive: true })
}
