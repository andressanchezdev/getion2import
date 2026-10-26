// DailySalesScreen · pantalla de Reportes > Ventas Diarias: resumen de ventas de la bodega activa en el rango elegido (hoy por defecto)
// conecta con: reports.selectors/slice (rango y resultado), useReportLoader (lo pide), ReportRangeBar y ReportMetricGrid; la monta MainContent (screenRegistry)
// ojo: POST /sales/summary solo trae totales (los desgloses por canal, medio de pago y estado llegan null), por eso no hay gráficas
import React from 'react'
import './ReportScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { ReportMetricGrid } from '../components/ReportMetricGrid'
import { ReportRangeBar } from '../components/ReportRangeBar'
import { useReportLoader } from '../hooks/useReportLoader'
import { selectDailyRange, selectSalesReport } from '../selectors/reports.selectors'
import { setDailyRange } from '../slices/reports.slice'
import { loadSalesReportThunk } from '../thunks/reports.thunks'

export const DailySalesScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const range = useAppSelector(selectDailyRange)
  const block = useAppSelector(selectSalesReport)
  useReportLoader(['sales'])

  return (
    <div className="report-screen">
      <ReportRangeBar range={range} onChange={(next) => dispatch(setDailyRange(next))} />
      <ReportMetricGrid title="Resumen de ventas" block={block} onRetry={() => dispatch(loadSalesReportThunk())} />
    </div>
  )
}

export default DailySalesScreen
