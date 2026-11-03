// quotations/index · API pública de la feature cotizaciones (tabla, detalle en el panel y creación desde el carrito)
// conecta con: rootReducer (reducer), screenRegistry (QuotationsScreen), formRegistry (QuotationDetailPanel) y shop (createQuotation)
export * from './types/quotations.types'
export * from './services/quotations.service'
export * from './slices/quotations.slice'
export * from './screens/QuotationsScreen'
export * from './components/detail/QuotationDetailPanel'
