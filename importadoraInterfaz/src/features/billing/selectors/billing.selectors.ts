// billing.selectors · lecturas del estado de facturación
// conecta con: useInvoices, useBillingSettings y los formularios; leen state.billing
import type { BillingState } from '../types/billing.types'

// forma mínima del state (así la feature no importa el store de app)
type BillingRootState = { billing: BillingState }

export const selectBilling = (state: BillingRootState) => state.billing
