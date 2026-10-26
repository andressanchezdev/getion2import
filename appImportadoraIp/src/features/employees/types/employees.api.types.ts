// employees.api.types · lo que responde el backend en empleados, roles y permisos (nombres tal cual del Swagger y de las respuestas reales)
// conecta con: employees.adapter (los convierte a los tipos de la app) y employees.service (los pide)
// ojo: POST /employees trae la ficha completa con branches y roles pero NO pagina (ignora pageSize); POST /employees/list pagina pero no trae roles ni sedes.
// GET /employees/roles no devuelve roles sueltos sino áreas con sus roles (roles puede ser null)
import type { ModulePermission } from './employees.types'

export interface EmployeeBranchDto {
  branchId: number
  branchName?: string
}

export interface EmployeeRoleRefDto {
  roleId: number
  roleName?: string
}

// POST /employees (una fila)
export interface EmployeeDto {
  employeeId: number
  userId?: number
  name?: string
  lastName?: string
  email?: string
  identification?: string
  phone?: string
  photo?: string
  workModality?: string
  employmentStatus?: string
  isActive?: boolean
  branches?: EmployeeBranchDto[] | null
  roles?: EmployeeRoleRefDto[] | null
}

export interface RoleDto {
  roleId: number
  roleName?: string
  description?: string
  assignable?: boolean
  usersCount?: number
}

// GET /employees/roles (una fila): un área con sus roles
export interface RoleAreaDto {
  areaId: number
  areaName?: string
  roles?: RoleDto[] | null
}

// POST /employees/permissions
export interface EmployeePermissionsDto {
  employeeId?: number
  branches?: Array<{ branchId: number; branchName: string; isPrimary: boolean }> | null
  modules?: ModulePermission[] | null
}
