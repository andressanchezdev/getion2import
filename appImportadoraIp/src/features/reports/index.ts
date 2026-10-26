// reports/index · API pública de la feature reports (ventas diarias, reporte general y valoración de inventario)
// conecta con: rootReducer (reducer) y screenRegistry (DailySalesScreen, GeneralReportScreen, InventoryReportScreen)
export * from './types/reports.types'
export * from './types/reports.api.types'
export * from './selectors/reports.selectors'
export * from './slices/reports.slice'
export * from './thunks/reports.thunks'
export * from './hooks/useReportLoader'
export * from './screens/DailySalesScreen'
export * from './screens/GeneralReportScreen'
export * from './screens/InventoryReportScreen'
