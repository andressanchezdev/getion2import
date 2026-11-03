// useWarehouseStock · pide las existencias de la bodega cuando cambia la bodega o el texto buscado (con espera) y devuelve cómo va la carga
// conecta con: WarehouseProductsTable (lo usa), transfers.thunks, transfers.selectors y auth (hay sesión)
import { useCallback, useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { TRANSFERS_SEARCH_DELAY_MS } from '../constants/transfers.constants'
import { selectWarehouseStock } from '../selectors/transfers.selectors'
import { loadWarehouseStockThunk } from '../thunks/transfers.thunks'

export const useWarehouseStock = (warehouseId: number, query: string) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const stock = useAppSelector(selectWarehouseStock)
  const debounced = useDebouncedValue(query, TRANSFERS_SEARCH_DELAY_MS)

  const reload = useCallback(() => {
    if (hasSession && warehouseId > 0) dispatch(loadWarehouseStockThunk({ warehouseId, query: debounced }))
  }, [dispatch, hasSession, warehouseId, debounced])

  useEffect(reload, [reload])

  return { ...stock, reload }
}
