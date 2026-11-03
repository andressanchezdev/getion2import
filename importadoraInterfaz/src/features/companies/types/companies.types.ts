// companies.types · modelo de compañía que usa la app (lo que muestra el selector del superadmin)
// conecta con: companies.adapter (lo arma), companies.service, useCompanies y CompanySelector
import type { LoadStatus } from '@/api'

export interface Company {
  id: number
  name: string
  city?: string
  email?: string
  isActive: boolean
}

// estado del slice: las compañías que el superadmin puede elegir y ver (se piden una vez por sesión)
export interface CompaniesState {
  items: Company[]
  status: LoadStatus
  error: string | null
}
