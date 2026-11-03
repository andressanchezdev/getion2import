// reports.thunks · carga del reporte general
// conecta con: reports.service (llamada) y reports.slice (reacciona); la despacha useGeneralReport
// ojo: cada carga lleva su requestId y el slice descarta las respuestas de cargas anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { getGeneralReport } from '../services/reports.service'
import type { GeneralDashboardReport } from '../types/reports.types'

export const loadGeneralReportThunk = createAsyncThunk<GeneralDashboardReport, void, { rejectValue: string }>('reports/loadGeneral', async (_, { rejectWithValue }) => {
  try {
    return await getGeneralReport()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Error al cargar el reporte general.'))
  }
})
