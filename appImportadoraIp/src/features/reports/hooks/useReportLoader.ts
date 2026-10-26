// useReportLoader · pide al backend los reportes indicados al abrir la pantalla y cada vez que cambia su rango de fechas o la bodega activa
// conecta con: DailySalesScreen, GeneralReportScreen y InventoryReportScreen; despacha reports.thunks y lee la sesión (auth), la bodega (navigation) y los rangos
// ojo: solo corre con sesión; un rango inválido no llama al backend (el thunk deja el aviso en el estado)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectDailyRange, selectGeneralRange } from '../selectors/reports.selectors'
import { loadCustomersReportThunk, loadFinancialReportThunk, loadInventoryReportThunk, loadSalesReportThunk } from '../thunks/reports.thunks'
import type { ReportName } from '../types/reports.types'

const THUNKS = {
  sales: loadSalesReportThunk,
  financial: loadFinancialReportThunk,
  customers: loadCustomersReportThunk,
  inventory: loadInventoryReportThunk,
} as const

export const useReportLoader = (names: ReportName[]): void => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const warehouseId = useAppSelector((state: { ui: { activeWarehouseId: string } }) => state.ui.activeWarehouseId)
  const daily = useAppSelector(selectDailyRange)
  const general = useAppSelector(selectGeneralRange)
  const key = names.join(',')

  useEffect(() => {
    if (!companyId) return
    for (const name of key.split(',') as ReportName[]) dispatch(THUNKS[name]())
  }, [dispatch, companyId, warehouseId, daily, general, key])
}
