// employees.service · llamadas a Swagger para gestión de empleados, roles, credenciales y permisos
// conecta con: apiClient, API_CONFIG (EMPLOYEES), employees.types y pantallas de empleados y roles
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type {
  EmployeePermissionsResponse,
  EmployeeRole,
  ModulePermission,
  SimpleEmployee,
  UpdateCredentialsInput,
} from '../types/employees.types'

const { EMPLOYEES } = API_CONFIG.ENDPOINTS

export const fetchEmployeesList = async (
  companyId: number,
  warehouseId?: number
): Promise<SimpleEmployee[]> => {
  const { data } = await apiClient.post<APIResponse<any>>(EMPLOYEES.LIST, {
    companyId,
    limit: 50,
    page: 1,
    ...(warehouseId && { warehouseId }),
  })

  const rawList = Array.isArray(data.data) ? data.data : toPaginated(data).items || []

  return rawList.map((emp: any) => ({
    employeeId: emp.employeeId || emp.userId || emp.id,
    name: emp.name || '',
    lastName: emp.lastName,
    email: emp.email || '',
    identification: emp.identification || '',
    workModality: emp.workModality,
    primaryWarehouseId: emp.primaryWarehouseId,
    warehouseName: emp.warehouseName || emp.warehouseInformation?.name,
    roleName: emp.roleName || emp.userType,
    phone: emp.phone,
    employmentStatus: emp.employmentStatus,
    isActive: emp.isActive !== false,
  }))
}

export const fetchEmployeePermissions = async (
  employeeId: number
): Promise<EmployeePermissionsResponse> => {
  const { data } = await apiClient.post<APIResponse<any>>(EMPLOYEES.PERMISSIONS, {
    employeeId,
  })

  const payload = data.data || {}
  return {
    branches: payload.branches || [],
    modules: payload.modules || [],
  }
}

export const saveEmployeePermissions = async (
  employeeId: number,
  modules: ModulePermission[]
): Promise<void> => {
  await apiClient.post(EMPLOYEES.SAVE_PERMISSIONS, {
    employeeId,
    modules,
  })
}

export const fetchEmployeeRoles = async (): Promise<EmployeeRole[]> => {
  const { data } = await apiClient.get<APIResponse<any>>(EMPLOYEES.ROLES)
  const list = Array.isArray(data.data) ? data.data : []
  return list.map((r: any) => ({
    roleId: r.roleId || r.id,
    roleName: r.roleName || r.name,
    description: r.description,
  }))
}

export const updateAccessCredentials = async (
  input: UpdateCredentialsInput
): Promise<void> => {
  await apiClient.put(EMPLOYEES.CREDENTIALS, {
    employeeId: input.employeeId,
    email: input.email.trim(),
    password: input.password,
    ...(input.currentPassword && { currentPassword: input.currentPassword }),
  })
}
