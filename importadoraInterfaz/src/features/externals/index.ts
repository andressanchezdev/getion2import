// externals · proveedores y transportadoras (terceros): tabla, panel de registro, estado y servicio
// conecta con: screenRegistry (pantallas), rootReducer (externalsReducer), formRegistry (ExternalFormPanel) y employees (DocumentType)
export * from './types/externals.types'
export * from './services/externals.service'
export * from './screens/SuppliersScreen'
export * from './screens/CarriersScreen'
export { externalsReducer } from './slices/externals.slice'
export { ExternalFormPanel, type ExternalFormPayload } from './components/drawer/ExternalFormPanel'
