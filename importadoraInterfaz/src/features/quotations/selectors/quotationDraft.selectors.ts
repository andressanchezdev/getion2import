// quotationDraft.selectors · lecturas de la cotización en armado: renglones, cantidades por producto, unidades y total
// conecta con: quotationDraft.slice; las usan QuotationCatalogScreen y QuotationDraftPanel
import { createSelector } from '@reduxjs/toolkit'
import type { QuotationDraftLine } from '../types/quotations.types'

interface DraftRootState {
  quotationDraft: { lines: QuotationDraftLine[] }
}

export const selectDraftLines = (state: DraftRootState) => state.quotationDraft.lines

// id del producto (texto, como en el catálogo) → cantidad ya agregada
export const selectDraftQuantities = createSelector([selectDraftLines], (lines) => Object.fromEntries(lines.map((line) => [String(line.productId), line.quantity])))

export const selectDraftUnits = createSelector([selectDraftLines], (lines) => lines.reduce((sum, line) => sum + line.quantity, 0))

export const selectDraftTotal = createSelector([selectDraftLines], (lines) => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
