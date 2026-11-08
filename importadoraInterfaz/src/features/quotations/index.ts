// quotations/index · API pública de la feature cotizaciones (catálogo para cotizar, borrador, historial en tabla y detalle en el panel)
// conecta con: rootReducer (reducers), screenRegistry (QuotationCatalogScreen y QuotationsScreen), formRegistry (QuotationDetailPanel y QuotationDraftPanel) y checkout (createQuotation y clearDraft)
export * from './types/quotations.types'
export * from './services/quotations.service'
export * from './slices/quotations.slice'
export * from './screens/QuotationsScreen'
export * from './screens/QuotationCatalogScreen'
export * from './slices/quotationDraft.slice'
export * from './selectors/quotationDraft.selectors'
export * from './components/draft/QuotationDraftPanel'
export * from './components/detail/QuotationDetailPanel'
