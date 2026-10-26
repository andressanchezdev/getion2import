// GeneralReportScreen · pantalla de Reportes > Reporte General: resultados financieros y de clientes de la empresa en el rango elegido (últimos 30 días por defecto)
// conecta con: reports.selectors/slice (rango y resultados), useReportLoader (los pide), ReportRangeBar y ReportMetricGrid; la monta MainContent (screenRegistry)
// ojo: las dos secciones se piden y fallan por separado; los desgloses (ingresos por mes, mejores clientes) llegan null con los datos de prueba y no se muestran
import React from 'react'
import './ReportScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { ReportMetricGrid } from '../components/ReportMetricGrid'
import { ReportRangeBar } from '../components/ReportRangeBar'
import { useReportLoader } from '../hooks/useReportLoader'
import { selectCustomersReport, selectFinancialReport, selectGeneralRange } from '../selectors/reports.selectors'
import { setGeneralRange } from '../slices/reports.slice'
import { loadCustomersReportThunk, loadFinancialReportThunk } from '../thunks/reports.thunks'

export const GeneralReportScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const range = useAppSelector(selectGeneralRange)
  const financial = useAppSelector(selectFinancialReport)
  const customers = useAppSelector(selectCustomersReport)
  useReportLoader(['financial', 'customers'])

  return (
    <div className="report-screen">
      <ReportRangeBar range={range} onChange={(next) => dispatch(setGeneralRange(next))} />
      <ReportMetricGrid title="Resultado financiero" block={financial} onRetry={() => dispatch(loadFinancialReportThunk())} />
      <ReportMetricGrid title="Clientes" block={customers} onRetry={() => dispatch(loadCustomersReportThunk())} />
    </div>
  )
}

export default GeneralReportScreen
