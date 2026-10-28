// useOpenOrderDetail · pide el detalle del pedido abierto en el panel derecho cuando cambia el pedido elegido
// conecta con: OrderDetail (lo usa al montarse); despacha orders.thunks y lee orders.slice (pedido abierto)
// ojo: si el pedido abierto cambia mientras llega la respuesta, el slice descarta la vieja (requestId)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { loadOrderDetailThunk } from '../thunks/orders.thunks'
import { selectOpenOrderId } from '../selectors/orders.selectors'

export const useOpenOrderDetail = (): void => {
  const dispatch = useAppDispatch()
  const openId = useAppSelector(selectOpenOrderId)

  useEffect(() => {
    if (openId !== null) dispatch(loadOrderDetailThunk(openId))
  }, [dispatch, openId])
}
