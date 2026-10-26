// reports.slice · estado de reportes: rangos de fechas y el resultado (tarjetas, estado y error) de cada reporte
// conecta con: reports.thunks (lo llenan), reports.selectors (lecturas) y rootReducer (clave 'reports'; NO se guarda en el navegador)
// ojo: cada reporte descarta las respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { createInitialReportsState } from '../constants/reports.constants'
import { loadCustomersReportThunk, loadFinancialReportThunk, loadInventoryReportThunk, loadSalesReportThunk } from '../thunks/reports.thunks'
import type { DateRange, ReportName, ReportsState } from '../types/reports.types'

const THUNKS = {
  sales: loadSalesReportThunk,
  financial: loadFinancialReportThunk,
  customers: loadCustomersReportThunk,
  inventory: loadInventoryReportThunk,
} as const

export const reportsSlice = createSlice({
  name: 'reports',
  initialState: createInitialReportsState(),
  reducers: {
    setDailyRange: (state, action: PayloadAction<DateRange>) => {
      state.dailyRange = action.payload
    },
    setGeneralRange: (state, action: PayloadAction<DateRange>) => {
      state.generalRange = action.payload
    },
  },
  extraReducers: (builder) => {
    for (const name of Object.keys(THUNKS) as ReportName[]) {
      const thunk = THUNKS[name]
      builder
        .addCase(thunk.pending, (state, action) => {
          state[name].status = 'loading'
          state[name].error = null
          state[name].requestId = action.meta.requestId
        })
        .addCase(thunk.fulfilled, (state, action) => {
          if (state[name].requestId !== action.meta.requestId) return
          state[name].metrics = action.payload.metrics
          state[name].generatedAt = action.payload.generatedAt
          state[name].status = 'succeeded'
        })
        .addCase(thunk.rejected, (state, action) => {
          if (state[name].requestId !== action.meta.requestId) return
          state[name].status = 'failed'
          state[name].error = action.payload ?? 'No se pudo cargar el reporte.'
        })
    }
    // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
    builder.addMatcher(
      (action) => action.type === 'auth/logout/fulfilled',
      (): ReportsState => createInitialReportsState()
    )
  },
})

export const { setDailyRange, setGeneralRange } = reportsSlice.actions
export const reportsReducer = reportsSlice.reducer
export default reportsSlice.reducer
