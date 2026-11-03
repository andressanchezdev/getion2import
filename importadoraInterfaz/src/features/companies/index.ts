// companies/index · API pública de la feature compañías (lista del superadmin para el selector del header y la pantalla de compañías)
// conecta con: CompanySelector (header), rootReducer (reducer) y SitesScreen (configuración)
export * from './types/companies.types'
export * from './slices/companies.slice'
export * from './hooks/useCompanies'
export * from './screens/CompaniesScreen'
