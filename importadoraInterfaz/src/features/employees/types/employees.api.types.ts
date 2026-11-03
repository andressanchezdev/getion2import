// employees.api.types · lo que responde la API en Go en empleados, roles y permisos (GET /employees, /roles, /permissions y /employees/:id/permissions)
// conecta con: employees.adapter (los convierte a los tipos de la app) y employees.service (los pide)
// ojo: nombres tal cual del backend (EmployeeResponse, RoleResponse y PermissionResponse); los permisos son planos: módulo + acción

export interface EmployeeDto {
  id: number
  roleId?: number
  roleName?: string
  warehouseId?: number | null
  warehouseName?: string | null
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  document?: string | null
  phone?: string | null
  workModality?: string
  employmentStatus?: string
  status?: string // 'active' | 'inactive' | ...
  createdAt?: string
}

export interface RoleDto {
  id: number
  code?: string
  name: string
  description?: string | null
  isActive?: boolean
}

// un permiso del catálogo o de un empleado: ej. { id: 12, module: 'orders', action: 'view' }
export interface PermissionDto {
  id: number
  module: string
  action: string
}
