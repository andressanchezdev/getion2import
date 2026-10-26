// reports.selectors · lecturas del estado de reportes
// conecta con: las pantallas de reportes, useReportLoader y reports.thunks; leen state.reports
// ojo: los rangos sin elegir se calculan aquí con la fecha de HOY (no se guardan), y createSelector devuelve el mismo objeto mientras no cambie el día
import { createSelector } from '@reduxjs/toolkit'
import { GENERAL_REPORT_DAYS } from '../constants/reports.constants'
import { daysAgoString, todayString } from '../helpers/reports.dates'
import type { ReportsState } from '../types/reports.types'

type ReportsRootState = { reports: ReportsState }

const today = () => todayString()

export const selectDailyRange = createSelector([(state: ReportsRootState) => state.reports.dailyRange, today], (range, now) => range ?? { start: now, end: now })
export const selectGeneralRange = createSelector([(state: ReportsRootState) => state.reports.generalRange, today], (range, now) => range ?? { start: daysAgoString(GENERAL_REPORT_DAYS), end: now })
export const selectSalesReport = (state: ReportsRootState) => state.reports.sales
export const selectFinancialReport = (state: ReportsRootState) => state.reports.financial
export const selectCustomersReport = (state: ReportsRootState) => state.reports.customers
export const selectInventoryReport = (state: ReportsRootState) => state.reports.inventory
