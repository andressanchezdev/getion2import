// useOrdersLoader · pide al backend los conteos por etapa y la tabla de pedidos, y los vuelve a pedir al cambiar de etapa, de canal o de bodega
// conecta con: OrdersScreen (lo usa al montarse); despacha orders.thunks y lee la sesión (auth), la bodega (navigation), warehouses (estado de carga) y orders.slice
// ojo: no pide hasta que haya bodega activa (los pedidos dependen de ella), salvo que las bodegas hayan fallado: ahí pide igual para mostrar el aviso en la tabla
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectWarehousesStatus } from '@/features/warehouses'
import { loadOrderCountsThunk, loadOrdersThunk } from '../thunks/orders.thunks'

export const useOrdersLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const warehousesStatus = useAppSelector(selectWarehousesStatus)
  const stage = useAppSelector((state) => state.orders.stage)
  const channel = useAppSelector((state) => state.orders.channel)

  const ready = activeWarehouseId !== '' || warehousesStatus === 'failed'

  useEffect(() => {
    if (!companyId || !ready) return
    dispatch(loadOrderCountsThunk())
  }, [dispatch, companyId, ready, activeWarehouseId])

  useEffect(() => {
    if (!companyId || !ready) return
    dispatch(loadOrdersThunk())
  }, [dispatch, companyId, ready, activeWarehouseId, stage, channel])
}
