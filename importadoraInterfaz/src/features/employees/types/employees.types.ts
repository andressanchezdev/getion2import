// employees.types · contratos de empleados, roles y permisos jerárquicos (Swagger)
// conecta con: employees.service, RolesPermissionsScreen, EmployeesScreen y usePermissions
import type { LoadStatus } from '@/api'


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
  canEditPrices?: boolean
}

export interface ModulePermission {
  moduleId?: number
  moduleKey: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canEditPrices?: boolean
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
  warehouseName?: string
  roleName?: string
  phone?: string
  employmentStatus?: string
  isActive?: boolean
  createdAt?: string // cuándo se creó el empleado
}

export interface EmployeeRole {
  roleId: number
  roleName: string
  description?: string
  code?: string
  isActive?: boolean
}

// lo que se manda a POST /roles y PUT /roles/:id
export interface RoleInput {
  code?: string // solo al crear
  name: string
  description: string
  isActive?: boolean // solo al editar
  reason?: string // obligatorio (10 a 100) al desactivar
}

// estado del slice: lista de empleados (con la bodega por la que se pidió) y lista de roles
export interface EmployeesState {
  directory: { items: SimpleEmployee[]; status: LoadStatus; error: string | null; requestId: string | null; warehouseId: number | undefined }
  roles: { items: EmployeeRole[]; status: LoadStatus; error: string | null }
}

export interface UpdateCredentialsInput {
  employeeId: number
  email: string
  password: string
  currentPassword?: string
}

export type WorkModality = 'onsite' | 'remote' | 'hybrid'

// datos del formulario «Registrar empleado» (POST /employees)
export interface NewEmployeeInput {
  firstName: string
  lastName: string
  email: string
  password: string
  documentType: 'NIT' | 'CC' | 'CE' | 'PA'
  document?: string
  phone?: string
  warehouseId: number
  roleId: number
  workModality: WorkModality
}
