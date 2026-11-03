// usePurchaseDetail · pide el detalle de una orden de compra (con sus renglones) al abrir el panel
// conecta con: PurchaseDetailPanel y PurchaseReceivePanel (lo usan), purchases.thunks (loadPurchaseDetailThunk), purchases.slice (openPurchase) y purchases.selectors
// ojo: si el estado guarda el detalle de OTRA orden se devuelve «cargando» y sin datos, así nunca se ven renglones ajenos
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectPurchaseDetail } from '../selectors/purchases.selectors'
import { openPurchase } from '../slices/purchases.slice'
import { loadPurchaseDetailThunk } from '../thunks/purchases.thunks'

export const usePurchaseDetail = (id: number) => {
  const dispatch = useAppDispatch()
  const detail = useAppSelector(selectPurchaseDetail)

  useEffect(() => {
    dispatch(openPurchase(id))
    dispatch(loadPurchaseDetailThunk(id))
  }, [dispatch, id])

  const isCurrent = detail.id === id
  const purchase = isCurrent ? detail.data : null
  return {
    purchase,
    loading: !isCurrent || detail.status === 'idle' || (detail.status === 'loading' && !purchase),
    failed: isCurrent && detail.status === 'failed',
    error: detail.error,
    reload: () => dispatch(loadPurchaseDetailThunk(id)),
  }
}
