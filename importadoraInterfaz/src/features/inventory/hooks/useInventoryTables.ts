// useInventoryTables · pide al backend la tabla de productos cuando cambia la página, la búsqueda (con espera) o la bodega activa
// ojo: la lista de productos NO depende de tener una bodega elegida (el catálogo es de la compañía); sin bodega solo faltan las existencias
// conecta con: ProductsScreen (lo usa), inventory.thunks, inventory.selectors y la bodega activa; auth (hay sesión)
import { useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { selectProductsTable } from '../selectors/inventory.selectors'
import { loadProductsTableThunk } from '../thunks/inventory.thunks'

const SEARCH_DELAY_MS = 350

export const useProductsTable = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const table = useAppSelector(selectProductsTable)
  const query = useDebouncedValue(table.query, SEARCH_DELAY_MS)

  useEffect(() => {
    if (hasSession) dispatch(loadProductsTableThunk({ page: table.page, query }))
  }, [dispatch, hasSession, warehouseId, table.page, query])

  return table
}
