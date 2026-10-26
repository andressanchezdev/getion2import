// useStageOrdersLoader · pide la lista de pedidos de la etapa y el canal elegidos, y la vuelve a pedir al cambiar de página, de etapa, de canal o de bodega
// conecta con: StageOrders; despacha management.thunks y lee la sesión (auth), la bodega (navigation) y el estado de management
// ojo: solo corre con sesión, con un canal elegido y en etapas que tienen lista (LISTABLE_STAGES)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { LISTABLE_STAGES } from '../constants/management.constants'
import { selectManagement } from '../selectors/management.selectors'
import { loadStageOrdersThunk } from '../thunks/management.thunks'

export const useStageOrdersLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const warehouseId = useAppSelector((state: { ui: { activeWarehouseId: string } }) => state.ui.activeWarehouseId)
  const { selected, channel, orders } = useAppSelector(selectManagement)

  useEffect(() => {
    if (companyId && channel && LISTABLE_STAGES.includes(selected)) dispatch(loadStageOrdersThunk())
  }, [dispatch, companyId, warehouseId, selected, channel, orders.page])
}
