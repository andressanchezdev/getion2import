// warehouses.selectors · lecturas de las bodegas: la lista activa, la de gestión y el estado de los cambios
// conecta con: useWarehouses (y con ella WarehouseSelector y WarehouseMenu) y los hooks de gestión; leen state.warehouses
import { createSelector } from '@reduxjs/toolkit'
import type { WarehousesState } from '../types/warehouse.types'

// forma mínima del state (así la feature no importa el store de app)
type WarehousesRootState = { warehouses: WarehousesState }

const selectRawItems = (state: WarehousesRootState) => state.warehouses.items
const selectRawManaged = (state: WarehousesRootState) => state.warehouses.managed

export const selectWarehouses = createSelector(
  [selectRawItems, selectRawManaged],
  (items, managed) => (items.length > 0 ? items : managed.filter((w) => w.isActive !== false))
)
// lee el estado de carga de las bodegas
export const selectWarehousesStatus = (state: WarehousesRootState) => state.warehouses.status
// la lista de gestión: todas las bodegas con inactivas y totales, su estado de carga y error
export const selectManagedWarehouses = (state: WarehousesRootState) => state.warehouses
// dice si hay un cambio en curso (guardar o cambiar el estado)
export const selectWarehousesSaving = (state: WarehousesRootState) => state.warehouses.saving
// la bodega que se acaba de crear o actualizar (la tabla la marca un momento)
export const selectRecentWarehouse = (state: WarehousesRootState) => state.warehouses.recent
