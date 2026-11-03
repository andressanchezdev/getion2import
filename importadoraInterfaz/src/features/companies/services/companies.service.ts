// companies.service · llamada al backend de compañías: GET /companies (las que el superadmin puede elegir en el header)
// conecta con: api/client, api/config y api/pagination, companies.adapter (convierte); la usa useCompanies
// ojo: pide de a 200 (máximo de la API) y junta las páginas; solo el superadmin ve todas, por eso solo él las pide
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import { toCompany } from '../helpers/companies.adapter'
import type { CompanyDto } from '../types/companies.api.types'
import type { Company } from '../types/companies.types'

const COMPANIES_PAGE_SIZE = 200
const COMPANIES_MAX_PAGES = 5

export const fetchCompanies = async (): Promise<Company[]> => {
  const dtos: CompanyDto[] = []
  for (let page = 1; page <= COMPANIES_MAX_PAGES; page++) {
    const { data } = await apiClient.get<APIResponse<CompanyDto[] | null>>(API_CONFIG.ENDPOINTS.COMPANIES.LIST, {
      params: { page, pageSize: COMPANIES_PAGE_SIZE },
    })
    const result = toPaginated(data)
    dtos.push(...result.items)
    if (!result.meta.hasNextPage) break
  }
  return dtos.map(toCompany).filter((company) => company.isActive)
}
