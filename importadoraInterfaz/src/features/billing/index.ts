// billing/index · API pública de la feature facturación (datos fiscales por bodega y series de consecutivos)
// conecta con: rootReducer (reducer), screenRegistry (pantalla) y formRegistry (paneles laterales)
// ojo: «Facturas» (lo que pagan las cajas) vive en la feature cashExpenses
export { billingReducer } from './slices/billing.slice'
export { BillingSettingsScreen } from './screens/BillingSettingsScreen'
export { BillingConfigPanel } from './components/drawer/BillingConfigPanel'
export { DocSeriesPanel } from './components/drawer/DocSeriesPanel'
export * from './types/billing.types'
