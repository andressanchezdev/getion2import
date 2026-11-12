// orders/index · API pública de la feature orders (Tienda > Bandeja de Pedidos)
// conecta con: rootReducer (reducer), screenRegistry (OrdersScreen), drawerRegistry (OrderDrawer y su encabezado)
export * from './types/orders.types'
export * from './selectors/orders.selectors'
export * from './slices/orders.slice'
export * from './screens/OrdersScreen'
export * from './components/detail/OrderDrawer'
export { OrdersToolbar } from './components/toolbar/OrdersToolbar'
export { OrdersTable } from './components/table/OrdersTable'
export { OrderCancelDialog } from './components/cancel/OrderCancelDialog'
export { useOrdersLoader } from './hooks/useOrdersLoader'
export { loadOrdersThunk, loadOrderCountsThunk, openOrderDetailThunk } from './thunks/orders.thunks'
export { ordersRealtimeHandlers } from './realtime/orders.realtime'
