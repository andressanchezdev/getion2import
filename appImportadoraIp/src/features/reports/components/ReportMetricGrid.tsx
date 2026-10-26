// ReportMetricGrid · muestra el resultado de un reporte como tarjetas: cargando, error con reintento o las métricas
// conecta con: reports.types (ReportBlock), global StatCard y formatCOP; la usan las tres pantallas de reportes
// ojo: los desgloses del backend (por día, canal, marca...) llegan null con los datos de prueba, por eso solo se muestran totales
import React from 'react'
import './ReportMetricGrid.css'
import { formatCOP } from '@/global/helpers/format'
import { StatCard } from '@/global/components/UI/molecules/StatCard'
import type { MetricFormat, ReportBlock } from '../types/reports.types'

const formatValue = (value: number, format: MetricFormat): string => {
  if (format === 'money') return formatCOP(value)
  if (format === 'percent') return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} %`
  return new Intl.NumberFormat('es-CO').format(value)
}

interface ReportMetricGridProps {
  title: string
  block: ReportBlock
  onRetry: () => void
}

export const ReportMetricGrid: React.FC<ReportMetricGridProps> = ({ title, block, onRetry }) => (
  <section className="report-section" aria-label={title}>
    <h3 className="report-section-title">{title}</h3>
    {block.status === 'failed' ? (
      <div className="report-message" role="alert">
        <p className="report-message-text">{block.error}</p>
        <button type="button" className="report-retry" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    ) : block.metrics.length === 0 ? (
      <div className="report-message">
        <p className="report-message-text">{block.status === 'succeeded' ? 'No hay datos para mostrar.' : 'Cargando…'}</p>
      </div>
    ) : (
      <div className="report-grid">
        {block.metrics.map((metric) => (
          <StatCard key={metric.key} title={metric.label} value={formatValue(metric.value, metric.format)} subtitle={metric.hint} />
        ))}
      </div>
    )}
  </section>
)

export default ReportMetricGrid
