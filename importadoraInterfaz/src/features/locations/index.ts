// locations/index · API pública de la feature locations (ubicaciones o estantes de cada bodega y sus códigos QR)
// conecta con: rootReducer (reducer), screenRegistry (LocationsScreen), formRegistry (paneles de formulario y detalle) y CreateProductForm (ubicaciones de una bodega)
export * from './types/locations.types'
export * from './selectors/locations.selectors'
export * from './slices/locations.slice'
export * from './thunks/locations.thunks'
export * from './hooks/useLocations'
export * from './helpers/locations.adapter'
export * from './screens/LocationsScreen'
export * from './components/drawer/LocationFormPanel'
export * from './components/drawer/LocationDetailPanel'
