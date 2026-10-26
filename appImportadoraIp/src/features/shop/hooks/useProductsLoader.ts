// useProductsLoader · pide los productos al backend cuando cambia algo que los afecta: filtros, texto (con espera), página o bodega
// conecta con: ShopCatalogScreen (lo usa al montarse); despacha shop.products.thunks y lee shop.products.selectors, shop.slice (filtros), navigation (bodega) y warehouses (estado de carga)
// ojo: no pide hasta que haya bodega activa (los productos y su stock dependen de ella), salvo que las bodegas hayan fallado: ahí pide igual para no dejar la pantalla vacía
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useDebouncedValue } from '@/global/hooks/useDebouncedValue'
import { selectCurrentUser } from '@/features/auth'
import { selectWarehousesStatus } from '@/features/warehouses'
import { loadProductsThunk } from '../thunks/shop.products.thunks'
import { selectProductsPage } from '../selectors/shop.products.selectors'

// espera tras la última tecla antes de buscar por texto
const SEARCH_DEBOUNCE_MS = 350

export const useProductsLoader = (): void => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const filters = useAppSelector((state) => state.shop.filters)
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const warehousesStatus = useAppSelector(selectWarehousesStatus)
  const page = useAppSelector(selectProductsPage)
  const debouncedQuery = useDebouncedValue(filters.searchQuery, SEARCH_DEBOUNCE_MS)

  const companyId = user?.companyId
  const ready = activeWarehouseId !== '' || warehousesStatus === 'failed'

  useEffect(() => {
    if (!companyId || !ready) return
    dispatch(loadProductsThunk())
    // ojo: el thunk lee los filtros del store; aquí solo se listan los que deben disparar una nueva carga (el texto va ya con espera)
  }, [dispatch, companyId, ready, activeWarehouseId, page, filters.selectedBrandId, filters.selectedCategoryId, filters.onlyInStock, debouncedQuery])
}
