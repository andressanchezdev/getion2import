// useManagementLoader · pide al backend los pedidos por etapa al abrir la pantalla y al cambiar de etapa o de bodega
// conecta con: PipelineScreen; despacha management.thunks y lee la sesión (auth), la bodega (navigation) y la etapa elegida
// ojo: solo corre con sesión; sin bodega el thunk deja el aviso "Elige una bodega"
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectManagement } from '../selectors/management.selectors'
import { loadPipelineThunk } from '../thunks/management.thunks'

export const useManagementLoader = (): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const warehouseId = useAppSelector((state: { ui: { activeWarehouseId: string } }) => state.ui.activeWarehouseId)
  const { selected } = useAppSelector(selectManagement)

  useEffect(() => {
    if (companyId) dispatch(loadPipelineThunk())
  }, [dispatch, companyId, warehouseId, selected])
}
