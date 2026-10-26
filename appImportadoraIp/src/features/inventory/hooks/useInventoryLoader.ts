// useInventoryLoader · pide al backend el control de inventario al abrir la pantalla y al cambiar de página, búsqueda, filtro o bodega
// conecta con: ProductControlScreen; despacha inventory.thunks y lee la sesión (auth), la bodega (navigation) y el estado de inventario
// ojo: solo el TEXTO de la búsqueda espera 300 ms tras la última letra (useDebouncedValue); página, filtro y bodega piden de inmediato. Solo corre con sesión
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useDebouncedValue } from '@/global/hooks/useDebouncedValue'
import { selectCurrentUser } from '@/features/auth'
import { selectInventory } from '../selectors/inventory.selectors'
import { loadInventoryThunk } from '../thunks/inventory.thunks'

const SEARCH_DELAY_MS = 300

export const useInventoryLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const warehouseId = useAppSelector((state: { ui: { activeWarehouseId: string } }) => state.ui.activeWarehouseId)
  const { page, query, onlyInStock } = useAppSelector(selectInventory)
  const debouncedQuery = useDebouncedValue(query, SEARCH_DELAY_MS)

  useEffect(() => {
    if (companyId) dispatch(loadInventoryThunk())
  }, [dispatch, companyId, warehouseId, page, debouncedQuery, onlyInStock])
}
