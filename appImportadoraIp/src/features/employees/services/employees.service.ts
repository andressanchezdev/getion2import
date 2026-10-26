// employees.service · llamadas al backend de empleados: POST /employees (directorio), GET /employees/roles, POST /employees/permissions, guardar permisos y credenciales
// conecta con: api/client y api/config, employees.adapter (convierte), employees.api.types y las pantallas de empleados y roles
// ojo: el directorio usa POST /employees (trae roles y sedes de todos, sin paginar) y no /employees/list (no trae roles ni sedes y devuelve un objeto, no una lista);
// GET /employees/roles pide companyId en la query y devuelve áreas con sus roles
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toEmployee, toRoles } from '../helpers/employees.adapter'
import type { EmployeeDto, EmployeePermissionsDto, RoleAreaDto } from '../types/employees.api.types'
import type { EmployeePermissionsResponse, EmployeeRole, ModulePermission, SimpleEmployee, UpdateCredentialsInput } from '../types/employees.types'

const { EMPLOYEES } = API_CONFIG.ENDPOINTS

export const fetchEmployeesList = async (companyId: number, warehouseId?: number): Promise<SimpleEmployee[]> => {
  const { data } = await apiClient.post<APIResponse<EmployeeDto[] | null>>(EMPLOYEES.BASE, {
    companyId,
    ...(warehouseId && { warehouseId }),
  })
  return (data.data ?? []).map(toEmployee)
}

export const fetchEmployeePermissions = async (employeeId: number): Promise<EmployeePermissionsResponse> => {
  const { data } = await apiClient.post<APIResponse<EmployeePermissionsDto | null>>(EMPLOYEES.PERMISSIONS, { employeeId })
  const payload = data.data ?? {}
  return { branches: payload.branches ?? [], modules: payload.modules ?? [] }
}

export const saveEmployeePermissions = async (employeeId: number, modules: ModulePermission[]): Promise<void> => {
  await apiClient.post(EMPLOYEES.SAVE_PERMISSIONS, { employeeId, modules })
}

export const fetchEmployeeRoles = async (companyId: number): Promise<EmployeeRole[]> => {
  const { data } = await apiClient.get<APIResponse<RoleAreaDto[] | null>>(EMPLOYEES.ROLES, { params: { companyId } })
  return toRoles(data.data ?? [])
}

export const updateAccessCredentials = async (input: UpdateCredentialsInput): Promise<void> => {
  await apiClient.put(EMPLOYEES.CREDENTIALS, {
    employeeId: input.employeeId,
    email: input.email.trim(),
    password: input.password,
    ...(input.currentPassword && { currentPassword: input.currentPassword }),
  })
}
