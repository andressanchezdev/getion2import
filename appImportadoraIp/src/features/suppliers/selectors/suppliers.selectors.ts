// suppliers.selectors · lecturas del estado de proveedores
// conecta con: SuppliersScreen y useSuppliersLoader; leen state.suppliers
import type { SuppliersState } from '../types/suppliers.types'

type SuppliersRootState = { suppliers: SuppliersState }

export const selectSuppliers = (state: SuppliersRootState) => state.suppliers
export const selectSuppliersSummary = (state: SuppliersRootState) => state.suppliers.summary
