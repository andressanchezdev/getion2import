// employees.types · contratos de empleados, roles y permisos jerárquicos (Swagger)
// conecta con: employees.service, RolesPermissionsScreen, EmployeesScreen y usePermissions

export interface BranchPermissionInfo {
  branchId: number
  branchName: string
  isPrimary: boolean
}

export interface ScreenPermission {
  screenId?: number
  screenKey?: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface ModulePermission {
  moduleId?: number
  moduleKey: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  screens: ScreenPermission[]
}

export interface EmployeePermissionsResponse {
  branches?: BranchPermissionInfo[]
  modules?: ModulePermission[]
}

export interface SaveModulePermissionsRequest {
  employeeId: number
  modules: ModulePermission[]
}

export interface SimpleEmployee {
  employeeId: number
  name: string
  lastName?: string
  email: string
  identification: string
  workModality?: string
  primaryWarehouseId?: number
  warehouseIds: number[] // todas las sedes del empleado (puede tener varias o ninguna)
  warehouseName?: string
  roleName?: string
  phone?: string
  employmentStatus?: string
  isActive?: boolean
}

export interface EmployeeRole {
  roleId: number
  roleName: string
  description?: string
  areaName?: string // área a la que pertenece el rol (Administración, Logística...)
}

export interface UpdateCredentialsInput {
  employeeId: number
  email: string
  password: string
  currentPassword?: string
}
