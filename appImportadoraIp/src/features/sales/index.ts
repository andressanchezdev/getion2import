// sales/index · API pública de la feature sales (historial de ventas y carritos pendientes)
// conecta con: rootReducer (reducer) y screenRegistry (SalesHistoryScreen, PendingCartsScreen)
export * from './types/sales.types'
export * from './types/sales.api.types'
export * from './selectors/sales.selectors'
export * from './slices/sales.slice'
export * from './thunks/sales.thunks'
export * from './hooks/useSalesList'
export * from './screens/SalesHistoryScreen'
export * from './screens/PendingCartsScreen'
