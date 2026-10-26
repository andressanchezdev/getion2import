// reports.constants · estado inicial y textos de reportes
// conecta con: reports.slice (initialState), reports.thunks (mensajes) y las pantallas
import type { ReportBlock, ReportsState } from '../types/reports.types'

export const GENERAL_REPORT_DAYS = 30 // el reporte general abre con los últimos 30 días

export const NO_WAREHOUSE_REPORT = 'Elige una bodega para ver este reporte.'
export const INVALID_RANGE_MESSAGE = 'La fecha inicial no puede ser posterior a la final.'

export const emptyReportBlock = (): ReportBlock => ({ metrics: [], generatedAt: '', status: 'idle', error: null, requestId: null })

// ojo: los rangos arrancan en null (= por defecto) y el valor real se calcula al leerlos con los selectors, así "hoy" sigue siendo hoy si la pestaña queda abierta pasada la medianoche
export const createInitialReportsState = (): ReportsState => ({
  dailyRange: null,
  generalRange: null,
  sales: emptyReportBlock(),
  financial: emptyReportBlock(),
  customers: emptyReportBlock(),
  inventory: emptyReportBlock(),
})
