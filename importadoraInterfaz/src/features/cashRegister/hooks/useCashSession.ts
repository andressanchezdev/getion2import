// useCashSession · pide el turno de caja de la bodega activa y entrega si está abierto, con acciones para abrir o cerrar (abren su panel lateral)
// conecta con: CashRegisterScreen, CashShiftSlider, CashClosedBanner (lo usan), cash.thunks (loadCashSessionThunk), cash.selectors, navigation (bodega activa y paneles) y auth (hay sesión)
// ojo: sin bodega activa no se consulta nada; si la consulta falla no se dice «caja cerrada»: se avisa el error (antes parecía cerrada)
import { useCallback, useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCash } from '../selectors/cash.selectors'
import { loadCashSessionThunk } from '../thunks/cash.thunks'

export const useCashSession = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const cash = useAppSelector(selectCash)

  const reload = useCallback(() => {
    if (hasSession && warehouseId > 0) dispatch(loadCashSessionThunk(warehouseId))
  }, [dispatch, hasSession, warehouseId])

  useEffect(reload, [reload])

  const isCurrent = cash.warehouseId === warehouseId
  const session = isCurrent ? cash.session : null

  return {
    warehouseId,
    warehouseName,
    session,
    isOpen: session?.status === 'open',
    loading: warehouseId > 0 && (!isCurrent || cash.status === 'idle' || cash.status === 'loading'),
    failed: isCurrent && cash.status === 'failed',
    error: cash.error,
    saving: cash.saving,
    reload,
    requestOpen: () => dispatch(openDrawerForm({ kind: 'cashOpen' })),
    requestClose: () => dispatch(openDrawerForm({ kind: 'cashClose' })),
  }
}
