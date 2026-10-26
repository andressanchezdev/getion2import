// customers/index · API pública de la feature customers (clientes, direcciones y descuentos)
// conecta con: rootReducer (reducer), screenRegistry (CustomersScreen), drawerRegistry (CustomerDrawer y su encabezado)
export * from './types/customers.types'
export * from './types/customers.api.types'
export * from './selectors/customers.selectors'
export * from './slices/customers.slice'
export * from './thunks/customers.thunks'
export * from './thunks/customers.details.thunks'
export * from './hooks/useCustomersLoader'
export * from './hooks/useSelectedCustomerData'
export * from './screens/CustomersScreen'
export * from './components/drawer/CustomerDrawer'
