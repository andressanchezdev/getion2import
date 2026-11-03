// useOrdersLoader · pide al backend los conteos por etapa y la tabla de pedidos, y los vuelve a pedir al cambiar de etapa, de canal o de bodega
// conecta con: OrdersScreen (lo usa al montarse); despacha orders.thunks y lee la sesión (auth), la bodega (navigation), warehouses (estado de carga) y orders.slice
// ojo: no pide hasta que haya bodega activa (los pedidos dependen de ella), salvo que las bodegas hayan fallado: ahí pide igual para mostrar el aviso en la tabla
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { loadOrderCountsThunk, loadOrdersThunk } from '../thunks/orders.thunks'

export const useOrdersLoader = (): void => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser)) // ojo: el superadmin no tiene compañía (companyId 0)
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const stage = useAppSelector((state) => state.orders.stage)
  const channel = useAppSelector((state) => state.orders.channel)

  const ready = true

  useEffect(() => {
    if (!hasSession || !ready) return
    dispatch(loadOrderCountsThunk())
  }, [dispatch, hasSession, ready, activeWarehouseId])

  useEffect(() => {
    if (!hasSession || !ready) return
    dispatch(loadOrdersThunk())
  }, [dispatch, hasSession, ready, activeWarehouseId, stage, channel])
}
