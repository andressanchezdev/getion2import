// reports.selectors · lecturas del reporte general
// conecta con: useGeneralReport; leen state.reports
import type { ReportsState } from '../slices/reports.slice'

// forma mínima del state (así la feature no importa el store de app)
type ReportsRootState = { reports: ReportsState }

export const selectGeneralReport = (state: ReportsRootState) => state.reports
