// companies.constants · estado inicial de las compañías
// conecta con: companies.slice (initialState)
import type { CompaniesState } from '../types/companies.types'

export const INITIAL_COMPANIES_STATE: CompaniesState = { items: [], status: 'idle', error: null }
