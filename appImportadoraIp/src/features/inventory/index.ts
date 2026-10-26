// inventory/index · API pública de la feature inventory (control de productos: existencias, reservado y disponible)
// conecta con: rootReducer (reducer) y screenRegistry (ProductControlScreen)
export * from './types/inventory.types'
export * from './types/inventory.api.types'
export * from './selectors/inventory.selectors'
export * from './slices/inventory.slice'
export * from './thunks/inventory.thunks'
export * from './hooks/useInventoryLoader'
export * from './screens/ProductControlScreen'
