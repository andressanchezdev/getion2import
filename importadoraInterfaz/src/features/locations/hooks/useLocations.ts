// useLocations · pide las ubicaciones de la bodega activa y las entrega con su estado de carga, junto con el nombre de la bodega
// conecta con: LocationsScreen y CreateProductForm (lo usan), locations.thunks, locations.selectors, ui (bodega activa) y auth (hay sesión)
// ojo: pasar `warehouseId` pide las de esa bodega (el formulario de producto elige la bodega); sin él usa la bodega activa
import { useCallback, useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectLocationsList } from '../selectors/locations.selectors'
import { loadLocationsThunk } from '../thunks/locations.thunks'

export const useLocations = (warehouseId?: number) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const list = useAppSelector(selectLocationsList)
  const wanted = warehouseId ?? (activeWarehouseId ? Number(activeWarehouseId) : 0)

  // vuelve a pedir las ubicaciones (por ejemplo después de reubicar productos desde el detalle)
  const reload = useCallback(() => {
    if (hasSession && wanted > 0) dispatch(loadLocationsThunk(wanted))
  }, [dispatch, hasSession, wanted])

  useEffect(reload, [reload])

  const warehouseName = warehouseId ? (warehouses.find((warehouse) => Number(warehouse.id) === warehouseId)?.name ?? '') : (activeWarehouseName ?? '')
  // ojo: mientras llega la lista de otra bodega no se muestran las de la anterior
  const items = list.warehouseId === wanted ? list.items : []
  return { warehouseId: wanted, warehouseName, items, status: list.warehouseId === wanted ? list.status : 'loading', error: list.error, saving: list.saving, reload }
}
