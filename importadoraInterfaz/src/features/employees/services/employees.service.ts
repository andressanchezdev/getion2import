// employees.service · llamadas al backend de empleados, roles, credenciales y permisos
// conecta con: api/client, api/config, api/params y api/pagination, employees.adapter (convierte) y navigation (MENU_ITEMS, para armar la matriz); las usan las pantallas de empleados y roles
// ojo: la API en Go toma la compañía del token; solo el superadmin (sin compañía) manda companyId
import { apiClient, API_CONFIG, toPaginated, withCompany, type APIResponse } from '@/api'
import { MENU_ITEMS } from '@/features/navigation'
import { toEmployeeRole, toModulePermissions, toPermissionIds, toSimpleEmployee } from '../helpers/employees.adapter'
import type { EmployeeDto, PermissionDto, RoleDto } from '../types/employees.api.types'
import type { EmployeePermissionsResponse, EmployeeRole, ModulePermission, NewEmployeeInput, RoleInput, SimpleEmployee, UpdateCredentialsInput } from '../types/employees.types'

const { EMPLOYEES } = API_CONFIG.ENDPOINTS

// los empleados de la compañía (primera página de 50); con warehouseId solo los de esa bodega
export const fetchEmployeesList = async (companyId: number, warehouseId?: number): Promise<SimpleEmployee[]> => {
  const { data } = await apiClient.get<APIResponse<EmployeeDto[] | null>>(EMPLOYEES.BASE, {
    params: withCompany(companyId, { page: 1, pageSize: 50, warehouseId }),
  })
  return toPaginated(data).items.map(toSimpleEmployee)
}

// los permisos planos de un empleado
const fetchPermissionList = async (employeeId: number): Promise<PermissionDto[]> => {
  const { data } = await apiClient.get<APIResponse<PermissionDto[] | null>>(EMPLOYEES.PERMISSIONS_OF(employeeId))
  return data.data ?? []
}

// la matriz de permisos de un empleado (módulos del menú y sus subgestiones)
export const fetchEmployeePermissions = async (employeeId: number): Promise<EmployeePermissionsResponse> => ({
  branches: [],
  modules: toModulePermissions(await fetchPermissionList(employeeId), MENU_ITEMS),
})

// guarda la matriz: PUT /employees/:id/permissions con los ids; la API reemplaza todo, por eso se conservan los permisos que la matriz no maneja
export const saveEmployeePermissions = async (employeeId: number, modules: ModulePermission[]): Promise<void> => {
  const [catalog, current] = await Promise.all([
    apiClient.get<APIResponse<PermissionDto[] | null>>(EMPLOYEES.PERMISSIONS_CATALOG).then((res) => res.data.data ?? []),
    fetchPermissionList(employeeId),
  ])
  await apiClient.put(EMPLOYEES.PERMISSIONS_OF(employeeId), { permissionIds: toPermissionIds(modules, catalog, current) })
}

// trae los roles que se pueden dar a un empleado
export const fetchEmployeeRoles = async (): Promise<EmployeeRole[]> => {
  const { data } = await apiClient.get<APIResponse<RoleDto[] | null>>(EMPLOYEES.ROLES_LIST, { params: { activeOnly: true } })
  return (data.data ?? []).map(toEmployeeRole)
}

// cambia la contraseña de un empleado (PUT /employees/:id/credentials); la API solo pide la contraseña nueva (mínimo 8 caracteres)
// ojo: el correo y la contraseña actual que recibía el backend anterior ya no viajan
export const updateAccessCredentials = async (input: UpdateCredentialsInput): Promise<void> => {
  await apiClient.put(EMPLOYEES.CREDENTIALS_OF(input.employeeId), { password: input.password })
}

// todos los roles de la compañía, también los inactivos (hasta 200)
export const fetchRolesList = async (): Promise<EmployeeRole[]> => {
  const { data } = await apiClient.get<APIResponse<RoleDto[] | null>>(EMPLOYEES.ROLES_LIST, { params: { page: 1, pageSize: 200 } })
  return (data.data ?? []).map(toEmployeeRole)
}

// crea un rol (POST /roles); la compañía sale del token
export const createRole = async (input: RoleInput): Promise<void> => {
  await apiClient.post(EMPLOYEES.ROLES_LIST, { code: input.code, name: input.name, description: input.description || undefined })
}

// edita un rol (PUT /roles/:id): nombre, descripción y si está activo; el código no cambia
export const updateRole = async (roleId: number, input: RoleInput): Promise<void> => {
  await apiClient.put(EMPLOYEES.ROLE_BY_ID(roleId), { name: input.name, description: input.description, isActive: input.isActive })
}

// registra un empleado activo (la compañía sale del token)
export const createEmployee = async (input: NewEmployeeInput): Promise<void> => {
  await apiClient.post(EMPLOYEES.BASE, { ...input, employmentStatus: 'active' })
}

// activa o desactiva un empleado
export const setEmployeeStatus = async (employeeId: number, status: 'active' | 'inactive'): Promise<void> => {
  await apiClient.put(EMPLOYEES.BY_ID(employeeId), { status })
}

// desbloquea la cuenta del empleado tras intentos fallidos (POST /employees/:id/unlock)
export const unlockEmployee = async (employeeId: number): Promise<void> => {
  await apiClient.post(EMPLOYEES.UNLOCK(employeeId))
}
