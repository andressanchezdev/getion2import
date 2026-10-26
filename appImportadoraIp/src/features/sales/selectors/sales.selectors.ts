// sales.selectors · lecturas del estado de ventas (historial y carritos pendientes)
// conecta con: SalesHistoryScreen, PendingCartsScreen y useSalesList; leen state.sales
import type { SalesState } from '../types/sales.types'

type SalesRootState = { sales: SalesState }

export const selectHistory = (state: SalesRootState) => state.sales.history
export const selectPending = (state: SalesRootState) => state.sales.pending
