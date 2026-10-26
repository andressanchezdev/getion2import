// useSalesList · pide al backend el historial o los carritos pendientes al abrir la pantalla, al cambiar de página y al cambiar de bodega
// conecta con: SalesHistoryScreen y PendingCartsScreen; despacha sales.thunks y lee la sesión (auth) y la bodega activa (navigation)
// ojo: solo corre con sesión; sin bodega elegida el thunk deja el aviso "Elige una bodega" en vez de llamar al backend
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { loadPendingCartsThunk, loadSalesHistoryThunk } from '../thunks/sales.thunks'

type SalesList = 'history' | 'pending'

export const useSalesList = (list: SalesList, page: number): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const warehouseId = useAppSelector((state: { ui: { activeWarehouseId: string } }) => state.ui.activeWarehouseId)

  useEffect(() => {
    if (!companyId) return
    if (list === 'history') dispatch(loadSalesHistoryThunk())
    else dispatch(loadPendingCartsThunk())
  }, [dispatch, companyId, warehouseId, list, page])
}
