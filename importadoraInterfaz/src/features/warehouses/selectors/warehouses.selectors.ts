// warehouses.selectors · lecturas de las bodegas (lista y estado de carga)
// conecta con: useWarehouses (y con ella WarehouseSelector y WarehouseMenu); leen state.warehouses
import type { WarehousesState } from '../types/warehouse.types'

// forma mínima del state (así la feature no importa el store de app)
type WarehousesRootState = { warehouses: WarehousesState }

export const selectWarehouses = (state: WarehousesRootState) => state.warehouses.items
export const selectWarehousesStatus = (state: WarehousesRootState) => state.warehouses.status
