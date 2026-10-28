// wallet.constants · filtros iniciales, estado inicial, tamaños de página y textos de estados de crédito
// conecta con: wallet.slice (initialState), wallet.service (cuántos pide), wallet.payments.service (método de pago) y los componentes (etiquetas)
// ojo: antes el estado inicial traía clientes de ejemplo (wallet.mocks); ahora todo llega del backend
import type { CreditStatus, WalletFilters, WalletState } from '../types/wallet.types'

export const WALLET_PAGE_SIZE = 30

// las facturas de un cliente caben en una sola página
export const WALLET_INVOICES_PAGE_SIZE = 50

// los abonos de la pantalla se registran como efectivo (con transferencia el backend exige imagen del comprobante; eso queda para el módulo de caja)
export const WALLET_PAYMENT_METHOD = 'cash'

// etiqueta (lo que ve el cliente) y variante visual de cada estado de crédito; la variante arma la clase del badge
export const CREDIT_STATUS_BADGES: Record<CreditStatus, { variant: string; label: string; sublabel?: string }> = {
  upToDate: { variant: 'up-to-date', label: '● Al día' },
  withBalance: { variant: 'warning', label: 'Con saldo' },
  blocked: { variant: 'blocked', label: '● Sin crédito' },
}

// pestañas de filtro por estado en la tabla de clientes
export const CREDIT_STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'upToDate', label: 'Al Día' },
  { key: 'withBalance', label: 'Con Saldo' },
  { key: 'blocked', label: 'Sin Crédito' },
] as const

export const INITIAL_WALLET_FILTERS: WalletFilters = {
  searchQuery: '',
  statusFilter: 'all',
}

export const INITIAL_WALLET_STATE: WalletState = {
  list: { items: [], status: 'idle', error: null, meta: null, page: 1, requestId: null },
  summary: { data: null, status: 'idle', error: null },
  filters: INITIAL_WALLET_FILTERS,
  selectedCustomer: null,
  isAccountDrawerOpen: false,
  invoices: { items: [], status: 'idle', error: null, saving: false },
}
