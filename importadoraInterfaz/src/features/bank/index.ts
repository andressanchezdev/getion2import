// bank/index · API pública de la feature bank (conciliación bancaria a partir del PDF del banco)
// conecta con: rootReducer (reducer), WalletScreen (pantalla) y formRegistry (panel de confirmar)
export * from './types/bank.types'
export * from './selectors/bank.selectors'
export * from './slices/bank.slice'
export * from './screens/BankReconciliationScreen'
export * from './components/drawer/BankConfirmPanel'
