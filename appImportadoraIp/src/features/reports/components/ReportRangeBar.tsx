// ReportRangeBar · barra con las fechas "Desde" y "Hasta" de un reporte
// conecta con: reports.dates (isValidRange); la usan DailySalesScreen y GeneralReportScreen, que guardan el rango en reports.slice
// ojo: si la fecha inicial es posterior a la final se avisa y el reporte no se pide (el thunk también lo valida)
import React from 'react'
import './ReportRangeBar.css'
import { INVALID_RANGE_MESSAGE } from '../constants/reports.constants'
import { isValidRange, todayString } from '../helpers/reports.dates'
import type { DateRange } from '../types/reports.types'

interface ReportRangeBarProps {
  range: DateRange
  onChange: (range: DateRange) => void
}

export const ReportRangeBar: React.FC<ReportRangeBarProps> = ({ range, onChange }) => {
  const valid = isValidRange(range.start, range.end)
  return (
    <div className="report-range">
      <label className="report-range-field">
        <span className="report-range-label">Desde</span>
        <input type="date" className="report-range-input" value={range.start} max={todayString()} onChange={(event) => onChange({ ...range, start: event.target.value })} />
      </label>
      <label className="report-range-field">
        <span className="report-range-label">Hasta</span>
        <input type="date" className="report-range-input" value={range.end} max={todayString()} onChange={(event) => onChange({ ...range, end: event.target.value })} />
      </label>
      {!valid && (
        <span className="report-range-error" role="alert">
          {INVALID_RANGE_MESSAGE}
        </span>
      )}
    </div>
  )
}

export default ReportRangeBar
