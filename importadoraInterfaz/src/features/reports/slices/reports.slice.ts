// reports.slice · estado del reporte general: los datos, si está cargando y el último error
// conecta con: reports.thunks (lo llenan), reports.selectors (lecturas), auth (al cerrar sesión se vacía) y rootReducer (clave 'reports'; NO se guarda en el navegador)
// ojo: al recargar se conservan los datos anteriores mientras llegan los nuevos (no parpadea en blanco)
import { createSlice } from '@reduxjs/toolkit'
import type { LoadStatus } from '@/api'
import { logoutThunk } from '@/features/auth'
import { loadGeneralReportThunk } from '../thunks/reports.thunks'
import type { GeneralDashboardReport } from '../types/reports.types'

export interface ReportsState {
  general: GeneralDashboardReport | null
  status: LoadStatus
  error: string | null
  requestId: string | null
}

export const INITIAL_REPORTS_STATE: ReportsState = { general: null, status: 'idle', error: null, requestId: null }

export const reportsSlice = createSlice({
  name: 'reports',
  initialState: INITIAL_REPORTS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadGeneralReportThunk.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadGeneralReportThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.general = action.payload
        state.status = 'succeeded'
      })
      .addCase(loadGeneralReportThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'Error al cargar el reporte general.'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_REPORTS_STATE)
  },
})

export const reportsReducer = reportsSlice.reducer
export default reportsSlice.reducer
