// purchases.selectors · lecturas del estado de compras
// conecta con: usePurchases, usePurchaseDetail, usePurchaseForm y las acciones; leen state.purchases
import type { PurchasesState } from '../types/purchases.types'

// forma mínima del state (así la feature no importa el store de app)
type PurchasesRootState = { purchases: PurchasesState }

export const selectPurchases = (state: PurchasesRootState) => state.purchases
export const selectPurchaseDetail = (state: PurchasesRootState) => state.purchases.detail
export const selectPurchasesSaving = (state: PurchasesRootState) => state.purchases.saving
export const selectSuppliers = (state: PurchasesRootState) => state.purchases.suppliers
