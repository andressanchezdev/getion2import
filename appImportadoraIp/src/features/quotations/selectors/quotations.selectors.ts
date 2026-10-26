// quotations.selectors · lecturas del estado de cotizaciones
// conecta con: QuotationsScreen y useQuotationsLoader; leen state.quotations
import type { QuotationsState } from '../types/quotations.types'

type QuotationsRootState = { quotations: QuotationsState }

export const selectQuotations = (state: QuotationsRootState) => state.quotations
