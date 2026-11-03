// reports.slice.test · el reporte general: carga, error y descarte de respuestas viejas
// conecta con: reports.slice y reports.thunks; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_REPORTS_STATE, reportsReducer } from './reports.slice'
import { loadGeneralReportThunk } from '../thunks/reports.thunks'
import type { GeneralDashboardReport } from '../types/reports.types'

const report: GeneralDashboardReport = {
  todaySalesCount: 3,
  todayRevenue: 450000,
  todayCompleted: 2,
  topSellingProducts: [],
  todayTransfers: { totalCount: 1, inCount: 0, outCount: 1, pendingCount: 1 },
  lowStockCount: 2,
  lowStockProducts: [],
  highRotationProducts: [],
  lowRotationProducts: [],
}

const pending = (requestId: string) => loadGeneralReportThunk.pending(requestId)
const fulfilled = (requestId: string) => loadGeneralReportThunk.fulfilled(report, requestId)
const rejected = (requestId: string) => loadGeneralReportThunk.rejected(null, requestId, undefined, 'Sin conexión')

describe('reports.slice', () => {
  it('al pedir queda cargando y al llegar guarda el reporte', () => {
    let state = reportsReducer(INITIAL_REPORTS_STATE, pending('a'))
    expect(state.status).toBe('loading')
    state = reportsReducer(state, fulfilled('a'))
    expect(state).toMatchObject({ status: 'succeeded', general: report })
  })

  it('una respuesta de una petición vieja se descarta', () => {
    let state = reportsReducer(INITIAL_REPORTS_STATE, pending('a'))
    state = reportsReducer(state, pending('b'))
    state = reportsReducer(state, fulfilled('a'))
    expect(state.general).toBeNull()
    expect(state.status).toBe('loading')
  })

  it('un error deja el mensaje y conserva los datos anteriores', () => {
    let state = reportsReducer(INITIAL_REPORTS_STATE, pending('a'))
    state = reportsReducer(state, fulfilled('a'))
    state = reportsReducer(state, pending('b'))
    expect(state.general).toEqual(report)
    state = reportsReducer(state, rejected('b'))
    expect(state).toMatchObject({ status: 'failed', error: 'Sin conexión', general: report })
  })
})
