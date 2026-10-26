// reports.thunks · carga cada reporte (ventas del periodo, financiero, clientes e inventario) con su rango de fechas y la bodega activa
// conecta con: reports.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y reports.slice (reacciona); las despacha useReport
// ojo: cada carga lleva su requestId y el slice descarta respuestas viejas; con un rango inválido o sin bodega (ventas e inventario) no se llama al backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState, type RequestContext } from '@/features/auth'
import { INVALID_RANGE_MESSAGE, NO_WAREHOUSE_REPORT } from '../constants/reports.constants'
import { selectDailyRange, selectGeneralRange } from '../selectors/reports.selectors'
import { isValidRange } from '../helpers/reports.dates'
import { fetchCustomerReport, fetchFinancialReport, fetchInventoryReport, fetchSalesSummary } from '../services/reports.service'
import type { DateRange, ReportResult, ReportsState } from '../types/reports.types'

type ThunkState = { auth: AuthState; ui: NavigationState; reports: ReportsState }
type Config = { state: ThunkState; rejectValue: string }

const NO_SESSION = 'No hay una sesión activa.'

// valida sesión, rango y bodega; devuelve el mensaje de rechazo o lo que hace falta para llamar al backend
type Prepared = { ok: false; error: string } | { ok: true; ctx: RequestContext; warehouseId: number | undefined }

const prepare = (state: ThunkState, range: DateRange | null): Prepared => {
  const ctx = selectRequestContext(state)
  if (!ctx) return { ok: false, error: NO_SESSION }
  if (range && !isValidRange(range.start, range.end)) return { ok: false, error: INVALID_RANGE_MESSAGE }
  return { ok: true, ctx, warehouseId: toWarehouseNumber(state.ui.activeWarehouseId) }
}

const makeThunk = (
  name: string,
  failure: string,
  rangeOf: ((state: ThunkState) => DateRange) | null,
  needsWarehouse: boolean,
  call: (ctx: RequestContext, range: DateRange, warehouseId: number | undefined) => Promise<ReportResult>
) =>
  createAsyncThunk<ReportResult, void, Config>(`reports/load/${name}`, async (_, { getState, rejectWithValue }) => {
    const state = getState()
    const range = rangeOf ? rangeOf(state) : { start: '', end: '' }
    const ready = prepare(state, rangeOf ? range : null)
    if (!ready.ok) return rejectWithValue(ready.error)
    if (needsWarehouse && ready.warehouseId === undefined) return rejectWithValue(NO_WAREHOUSE_REPORT)
    try {
      return await call(ready.ctx, range, ready.warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, failure))
    }
  })

export const loadSalesReportThunk = makeThunk('sales', 'No se pudo cargar el resumen de ventas.', selectDailyRange, true, (ctx, range, wh) => fetchSalesSummary(ctx, range, wh))
export const loadFinancialReportThunk = makeThunk('financial', 'No se pudo cargar el reporte financiero.', selectGeneralRange, false, (ctx, range) => fetchFinancialReport(ctx, range))
export const loadCustomersReportThunk = makeThunk('customers', 'No se pudo cargar el reporte de clientes.', selectGeneralRange, false, (ctx, range) => fetchCustomerReport(ctx, range))
export const loadInventoryReportThunk = makeThunk('inventory', 'No se pudo cargar la valoración del inventario.', null, true, (ctx, _range, wh) => fetchInventoryReport(ctx, wh))
