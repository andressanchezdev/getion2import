// wallet/index · API pública de la feature wallet
// conecta con: MainContent, DrawerRight, rootReducer
// ojo: esta feature antes se llamaba cartera, ahora wallet (igual que /wallet en la API)
// src/features/wallet/index.ts
export * from './types/wallet.types'
export * from './types/wallet.api.types'
export * from './types/wallet.account.types'
export * from './types/wallet.table.types'
export * from './constants/wallet.constants'
export * from './helpers/wallet.helpers'
export * from './selectors/wallet.selectors'
export * from './slices/wallet.slice'
export * from './thunks/wallet.thunks'
export * from './thunks/wallet.payments.thunks'
export * from './thunks/wallet.history.thunks'
export * from './hooks/usePaymentsHistory'
export * from './hooks/useCreditCustomerSearch'
export * from './components/kpis/WalletKpiHeader'
export * from './components/clientsTable/CreditClientsTable'
export * from './components/account/CreditAccountDrawer'
export * from './screens/WalletScreen'
export * from './components/drawer/CreateAbonoPanel'
export * from './components/drawer/AbonoDetailPanel'
export type { CreateAbonoPayload } from './hooks/useCreateAbono'
