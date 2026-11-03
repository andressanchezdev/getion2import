// useBillingSettings · pide los datos fiscales y las series de la bodega activa y abre sus paneles de edición
// conecta con: BillingSettingsScreen (lo usa), billing.thunks (loadBillingSettingsThunk), billing.selectors, navigation (abre «billingConfig» y «docSeriesForm») y auth (hay sesión)
// ojo: config en null significa que la bodega aún no tiene datos fiscales; mientras llegan los de otra bodega no se muestran los anteriores
import { useCallback, useEffect } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectBilling } from '../selectors/billing.selectors'
import { loadBillingSettingsThunk } from '../thunks/billing.thunks'
import type { DocSeries } from '../types/billing.types'

export const useBillingSettings = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const billing = useAppSelector(selectBilling)

  const reload = useCallback(() => {
    if (hasSession && warehouseId > 0) dispatch(loadBillingSettingsThunk(warehouseId))
  }, [dispatch, hasSession, warehouseId])

  useEffect(reload, [reload])

  const isCurrent = billing.warehouseId === warehouseId
  return {
    warehouseId,
    warehouseName,
    config: isCurrent ? billing.config : null,
    series: isCurrent ? billing.series : [],
    loading: warehouseId > 0 && (!isCurrent || billing.settingsStatus === 'idle' || billing.settingsStatus === 'loading'),
    failed: isCurrent && billing.settingsStatus === 'failed',
    error: billing.settingsError,
    reload,
    editConfig: () => dispatch(openDrawerForm({ kind: 'billingConfig' })),
    editSeries: (series: DocSeries) => dispatch(openDrawerForm({ kind: 'docSeriesForm', payload: series })),
  }
}
