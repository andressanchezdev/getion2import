// companies.adapter · convierte la compañía de la API a lo que usa la app; es el único lugar que conoce los nombres del backend
// conecta con: companies.service (lo usa), companies.api.types y companies.types
import type { CompanyDto } from '../types/companies.api.types'
import type { Company } from '../types/companies.types'

export const toCompany = (dto: CompanyDto): Company => ({
  id: dto.id,
  name: dto.name?.trim() || `Compañía ${dto.id}`,
  city: dto.city?.trim() || undefined,
  email: dto.email?.trim() || undefined,
  isActive: dto.isActive !== false,
})
