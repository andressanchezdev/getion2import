// reports/index · API pública de la feature reportes (tipos, service y la pantalla del reporte general)
// conecta con: screenRegistry (GeneralReportScreen)
export * from './types/reports.types'
export * from './services/reports.service'
export * from './screens/GeneralReportScreen'
export * from './screens/DashboardScreen'

export { reportsReducer } from './slices/reports.slice'
export { useGeneralReport } from './hooks/useGeneralReport'
