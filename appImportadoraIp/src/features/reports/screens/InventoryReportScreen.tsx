// InventoryReportScreen · pantalla de Reportes > Valoración Inventario: productos, existencias y valor del inventario de la bodega activa
// conecta con: reports.selectors (resultado), useReportLoader (lo pide) y ReportMetricGrid; la monta MainContent (screenRegistry)
// ojo: stockByBrand, stockByCategory y lowStockProducts llegan null con los datos de prueba: solo hay totales
import React from 'react'
import './ReportScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { ReportMetricGrid } from '../components/ReportMetricGrid'
import { useReportLoader } from '../hooks/useReportLoader'
import { selectInventoryReport } from '../selectors/reports.selectors'
import { loadInventoryReportThunk } from '../thunks/reports.thunks'

export const InventoryReportScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const block = useAppSelector(selectInventoryReport)
  useReportLoader(['inventory'])

  return (
    <div className="report-screen">
      <ReportMetricGrid title="Valoración del inventario" block={block} onRetry={() => dispatch(loadInventoryReportThunk())} />
    </div>
  )
}

export default InventoryReportScreen
