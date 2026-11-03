// superadmin.service · llamadas del superadmin para listar, crear y editar administradores de compañías y para registrar una compañía
// conecta con: api/client, api/config (STAFF_ADMINS y COMPANIES) y api/pagination; las usan superadmin.thunks
// ojo: solo HTTP; el backend limita estas rutas al superadmin
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import { ADMINS_PAGE_SIZE } from '../constants/superadmin.constants'
import type { AdminFilters, AdminUser, CreateAdminPayload, CreateCompanyPayload, UpdateAdminPayload } from '../types/superadmin.types'

const { STAFF_ADMINS, COMPANIES } = API_CONFIG.ENDPOINTS

export const listAdmins = async (filters: AdminFilters): Promise<Paginated<AdminUser>> => {
  const { data } = await apiClient.get<APIResponse<AdminUser[] | null>>(STAFF_ADMINS.LIST, {
    params: {
      q: filters.query.trim() || undefined,
      companyId: filters.companyId || undefined,
      isActive: filters.status === 'all' ? undefined : filters.status === 'active',
      page: filters.page,
      pageSize: ADMINS_PAGE_SIZE,
    },
  })
  return toPaginated(data)
}

export const createAdmin = async (payload: CreateAdminPayload): Promise<AdminUser> => {
  const { data } = await apiClient.post<APIResponse<AdminUser>>(STAFF_ADMINS.CREATE, payload)
  return data.data!
}

export const updateAdmin = async (id: number, payload: UpdateAdminPayload): Promise<AdminUser> => {
  const { data } = await apiClient.put<APIResponse<AdminUser>>(STAFF_ADMINS.UPDATE(id), payload)
  return data.data!
}

export const createCompany = async (payload: CreateCompanyPayload): Promise<{ id: number; name: string }> => {
  const { data } = await apiClient.post<APIResponse<{ id: number; name: string }>>(COMPANIES.CREATE, payload)
  return data.data!
}
