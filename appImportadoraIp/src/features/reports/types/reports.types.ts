// reports.types · tipos de la app para reportes: tarjetas de métricas, rango de fechas y estado de cada reporte
// conecta con: reports.adapter (arma las tarjetas), reports.slice (las guarda), reports.selectors y las pantallas
import type { LoadStatus } from '@/api'

export type MetricFormat = 'money' | 'count' | 'percent'

export interface ReportMetric {
  key: string
  label: string
  value: number
  format: MetricFormat
  hint?: string
}

export type ReportName = 'sales' | 'financial' | 'customers' | 'inventory'

export interface DateRange {
  start: string // AAAA-MM-DD
  end: string
}

export interface ReportResult {
  metrics: ReportMetric[]
  generatedAt: string
}

export interface ReportBlock extends ReportResult {
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export interface ReportsState {
  dailyRange: DateRange | null // Ventas Diarias; null = el valor por defecto (hoy), que se calcula al leer
  generalRange: DateRange | null // Reporte General; null = los últimos 30 días hasta hoy
  sales: ReportBlock
  financial: ReportBlock
  customers: ReportBlock
  inventory: ReportBlock
}
