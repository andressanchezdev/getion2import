// companies.selectors · lecturas del estado de compañías
// conecta con: companies.slice (estado) y useCompanies
import type { CompaniesState } from '../types/companies.types'

type CompaniesRootState = { companies: CompaniesState }

export const selectCompanies = (state: CompaniesRootState) => state.companies
