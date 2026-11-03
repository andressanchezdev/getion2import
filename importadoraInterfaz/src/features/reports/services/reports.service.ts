// reports.service · llamadas a los endpoints de reportes del backend: el reporte general (GET /reports/general)
// conecta con: api/client y api/config (REPORTS.GENERAL); la usa reports.thunks
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { GeneralDashboardReport } from '../types/reports.types'

export const getGeneralReport = async (): Promise<GeneralDashboardReport> => {
  const { data } = await apiClient.get<APIResponse<GeneralDashboardReport>>(API_CONFIG.ENDPOINTS.REPORTS.GENERAL)
  return data.data!
}
