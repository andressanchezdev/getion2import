// superadmin.constants · estado inicial de la gestión de administradores, tamaño de página y opciones de los filtros
// conecta con: superadmin.slice (estado inicial), AdminsToolbar (opciones) y AdminPersonFields (tipos de documento)
import { EMPTY_META } from '@/api'
import type { AdminStatusFilter, SuperadminState } from '../types/superadmin.types'

export const ADMINS_PAGE_SIZE = 15
export const MIN_ADMIN_PASSWORD_LENGTH = 8

export const INITIAL_SUPERADMIN_STATE: SuperadminState = {
  items: [],
  loading: false,
  error: null,
  meta: EMPTY_META,
  filters: { query: '', companyId: null, status: 'all', page: 1 },
}

export const ADMIN_STATUS_OPTIONS: Array<{ value: AdminStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PA', label: 'Pasaporte (PA)' },
]
