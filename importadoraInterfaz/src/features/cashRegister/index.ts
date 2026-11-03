// cashRegister/index · API pública de la feature caja
// conecta con: screenRegistry (CashRegisterScreen)
export { CashRegisterScreen } from './screens/CashRegisterScreen'
export { cashReducer } from './slices/cash.slice'
export { useCashSession } from './hooks/useCashSession'
export { CashOpenPanel } from './components/drawer/CashOpenPanel'
export { CashClosePanel } from './components/drawer/CashClosePanel'
export { CashClosedBanner } from './components/shift/CashClosedBanner'
export { CashCollectPanel } from './components/drawer/CashCollectPanel'
export type { CashCollectPayload } from './hooks/useCashCollect'
