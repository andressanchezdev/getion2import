// orders/index · API pública de la feature orders (Tienda > Bandeja de Pedidos)
// conecta con: rootReducer (reducer), screenRegistry (OrdersScreen), drawerRegistry (OrderDrawer y su encabezado)
export * from './types/orders.types'
export * from './selectors/orders.selectors'
export * from './slices/orders.slice'
export * from './screens/OrdersScreen'
export * from './components/detail/OrderDrawer'
