// superadmin.types · contratos de la gestión de administradores de compañías (solo superadmin) y el estado de la vista (clave 'superadmin')
// conecta con: superadmin.service (HTTP), superadmin.slice (estado), superadmin.helpers (cuerpos de envío) y los componentes de la pantalla
import type { PaginatorMetadata } from '@/api'

export interface AdminUser {
  id: number
  companyId: number
  companyName?: string
  email: string
  firstName: string
  lastName?: string
  fullName?: string
  documentType?: string
  document?: string
  phone?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type AdminStatusFilter = 'all' | 'active' | 'inactive'

export interface AdminFilters {
  query: string
  companyId: number | null // null = todas las empresas
  status: AdminStatusFilter
  page: number
}

export interface CreateAdminPayload {
  companyId: number
  email: string
  password: string
  firstName: string
  lastName?: string
  documentType?: string
  document?: string
  phone?: string
}

export interface UpdateAdminPayload {
  firstName?: string
  lastName?: string
  documentType?: string
  document?: string
  phone?: string
  isActive?: boolean
  reason?: string // obligatorio (10 a 100) al desactivar
  password?: string
}

// la empresa nueva que se registra junto con su primer administrador (el backend no guarda NIT)
export interface CreateCompanyPayload {
  name: string
  phone?: string
  address?: string
  city?: string
}

// qué guarda el formulario: editar un administrador, o crear uno (con una empresa existente o nueva)
export type SaveAdminInput =
  | { adminId: number; update: UpdateAdminPayload }
  | { create: Omit<CreateAdminPayload, 'companyId'>; companyId: number }
  | { create: Omit<CreateAdminPayload, 'companyId'>; newCompany: CreateCompanyPayload }

export interface AdminFormPayload {
  admin?: AdminUser
}

export interface SuperadminState {
  items: AdminUser[]
  loading: boolean
  error: string | null
  meta: PaginatorMetadata
  filters: AdminFilters
}

// borrador del formulario de administrador (todo texto, como lo escribe el usuario)
export interface AdminDraft {
  firstName: string
  lastName: string
  email: string
  password: string
  documentType: string
  document: string
  phone: string
  isActive: boolean
  companyMode: 'existing' | 'new'
  companyId: string
  company: { name: string; phone: string; address: string; city: string }
}
