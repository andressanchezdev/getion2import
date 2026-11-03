// warehouses/index — API pública de la feature warehouses
// conecta con: rootReducer (reducer), AppHeader (WarehouseSelector y WarehouseMenu usan useWarehouses y pickActiveWarehouse)
export * from './types/warehouse.types'
export * from './constants/warehouses.constants'
export * from './helpers/warehouses.helpers'
export * from './selectors/warehouses.selectors'
export * from './slices/warehouses.slice'
export * from './thunks/warehouses.thunks'
export * from './hooks/useWarehouses'
export * from './screens/WarehousesScreen'
export * from './helpers/warehouses.manage'
export { WarehouseFormPanel, type WarehouseFormPayload } from './components/drawer/WarehouseFormPanel'
export { WarehouseDetailPanel, type WarehouseDetailPayload } from './components/drawer/WarehouseDetailPanel'
export * from './components/CompanyWarehousesPanel'
