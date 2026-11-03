// purchases/index · API pública de la feature compras (órdenes de compra y recepción en bodega)
// conecta con: rootReducer (reducer), screenRegistry (pantallas) y formRegistry (paneles laterales)
export { purchasesReducer } from './slices/purchases.slice'
export { PurchaseOrdersScreen } from './screens/PurchaseOrdersScreen'
export { ReceivingScreen } from './screens/ReceivingScreen'
export { PurchaseDetailPanel, type PurchasePanelPayload } from './components/panels/PurchaseDetailPanel'
export { PurchaseReceivePanel } from './components/panels/PurchaseReceivePanel'
export { PurchaseFormPanel } from './components/panels/PurchaseFormPanel'
export * from './types/purchases.types'
