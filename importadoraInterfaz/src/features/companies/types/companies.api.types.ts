// companies.api.types · lo que responde la API en Go en GET /companies (CompanyResponse), con los nombres del backend
// conecta con: companies.adapter (convierte a Company) y companies.service
export interface CompanyDto {
  id: number
  name: string
  email?: string
  city?: string
  isActive?: boolean
}
