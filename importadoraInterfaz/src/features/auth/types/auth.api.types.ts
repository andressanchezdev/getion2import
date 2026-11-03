// auth.api.types · lo que responde la API en Go en el login, la renovación y GET /auth/me (nombres del backend tal cual)
// conecta con: auth.adapter (los convierte a AuthResponse) y auth.service (los pide)
// ojo: la API no manda "user": manda "actor" (admin, superadmin o empleado) y la lista de permisos

export type AuthActorType = 'superadmin' | 'admin' | 'employee' | 'customer' | string

export interface AuthPermissionDto {
  id: number
  module: string
  action: string
  key: string
  description?: string
}

export interface AuthActorDto {
  id: number
  actorType: AuthActorType
  email: string
  username?: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string
  documentType?: string
  document?: string
  address?: string
  photoUrl?: string
  accessLevel?: string
  employeeId?: number
  companyId?: number // el superadmin no pertenece a una compañía: no viene
  companyName?: string
  warehouseId?: number
  warehouseCode?: string
  warehouseName?: string
  roleId?: number
  roleCode?: string
  roleName?: string
  workModality?: string
  employmentStatus?: string
  status: string
  lastLoginAt?: string
}

// salida de POST /auth/login y POST /auth/refresh (viene dentro del envoltorio { success, data })
export interface AuthApiResponse {
  access_token: string
  refresh_token: string
  expiresIn: number
  actorType: AuthActorType
  actor: AuthActorDto
  permissions: AuthPermissionDto[]
}
