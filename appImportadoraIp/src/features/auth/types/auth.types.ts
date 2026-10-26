// auth.types · contratos de la sesión: usuario, credenciales, respuesta del login y estado del slice
// conecta con: auth.service, auth.slice, auth.thunks, auth.selectors y los componentes del login
// datos de la empresa que vienen en el usuario (Swagger: models.CompanyDetails); no se incluyen las listas de archivos (RUT, cédulas...)
export interface AuthCompanyInfo {
  businessName?: string
  tradeName?: string
  corporateName?: string
  nit?: string
  address?: string
  cityAndDepartment?: string
  email?: string
  phone?: number
  cellPhone?: number
  customerType?: string
  personType?: string
}

// ojo: priceType, comissionRate y companyInformation son opcionales porque una sesión guardada antes de esta versión no los trae
export interface AuthUser {
  userId: number
  companyId: number
  warehouseId?: number
  name: string
  lastName: string
  email: string
  identification: string
  photo: string
  userType: string
  priceType?: string // nivel de precio del usuario (P0..P3)
  comissionRate?: number // comisión (así se escribe en el backend)
  companyInformation?: AuthCompanyInfo
}

// datos que casi todo request del backend necesita en su cuerpo (companyId, userId, bodega y nivel de precio)
export interface RequestContext {
  companyId: number
  userId: number
  warehouseId?: number
  priceType?: string
}

// lo que se envía a POST /auth/login (remember no viaja: solo decide dónde se guarda la sesión)
export interface LoginCredentials {
  email: string
  password: string
  remember: boolean
}

// respuesta de POST /auth/login dentro del envoltorio { success, data }
export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated'

// por qué se cierra la sesión: la pidió el usuario, por inactividad, porque venció o porque se cerró en otra pestaña
export type LogoutReason = 'manual' | 'inactivity' | 'expired' | 'remote'

import type { EmployeePermissionsResponse } from '@/features/employees'

export interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  permissions?: EmployeePermissionsResponse | null
}
