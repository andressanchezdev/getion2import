// externals.types · contratos de proveedores y transportadoras (tabla externals de la API): lo que usa la app, lo que se envía y el estado del slice
// conecta con: externals.service, externals.slice, externals.selectors, los hooks y los componentes; employees importa DocumentType
import type { LoadStatus } from '@/api'

export type ExternalKind = 'supplier' | 'carrier' | 'other'

export type DocumentType = 'NIT' | 'CC' | 'CE' | 'PA'

export interface ExternalEntity {
  id: number
  companyId: number
  kind: ExternalKind
  category?: string
  documentType: DocumentType
  document?: string
  name: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  termsDays: number
  creditLimit: number
  coverage?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateExternalPayload {
  kind: ExternalKind
  category?: string
  documentType: DocumentType
  document?: string
  name: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  termsDays?: number
  creditLimit?: number
  coverage?: string
  isActive?: boolean
}

export type UpdateExternalPayload = Partial<CreateExternalPayload>

// filtro de estado de la tabla
export type ExternalStatusFilter = 'all' | 'active' | 'inactive'

// ---- estado del slice (no se guarda en el navegador) ----
export interface ExternalsState {
  kind: ExternalKind | null // de qué tipo son los registros cargados (proveedores o transportadoras)
  items: ExternalEntity[]
  status: LoadStatus
  error: string | null
  saving: boolean // hay un cambio en curso (guardar, cambiar estado o borrar)
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
}
