// warehouses/index · API pública de la feature warehouses
// conecta con: rootReducer (reducer), AppHeader (WarehouseSelector y WarehouseMenu usan useWarehouses y pickActiveWarehouse)
export * from './types/warehouse.types'
export * from './constants/warehouses.constants'
export * from './helpers/warehouses.helpers'
export * from './selectors/warehouses.selectors'
export * from './slices/warehouses.slice'
export * from './thunks/warehouses.thunks'
export * from './hooks/useWarehouses'
