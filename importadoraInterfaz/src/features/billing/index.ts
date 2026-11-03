// billing/index · API pública de la feature facturación (facturas emitidas, datos fiscales por bodega y series de consecutivos)
// conecta con: rootReducer (reducer), screenRegistry (pantallas) y formRegistry (paneles laterales)
export { billingReducer } from './slices/billing.slice'
export { InvoicesScreen } from './screens/InvoicesScreen'
export { BillingSettingsScreen } from './screens/BillingSettingsScreen'
export { BillingConfigPanel } from './components/drawer/BillingConfigPanel'
export { DocSeriesPanel } from './components/drawer/DocSeriesPanel'
export * from './types/billing.types'
