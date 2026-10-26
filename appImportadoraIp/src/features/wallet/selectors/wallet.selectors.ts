// wallet.selectors · lecturas del estado de cartera: totales (KPIs), clientes filtrados, estado de la lista, facturas y encabezado del panel
// conecta con: WalletKpiHeader, CreditClientsTable, CreditAccountDetail y drawerRegistry (selectAccountDrawerMeta, selectHasSelectedCustomer); leen state.wallet
// ojo: los totales ya no se suman en pantalla: vienen de POST /wallet/summary. Los filtros de texto y estado se aplican sobre la página cargada (el listado del backend no filtra)
import { createSelector } from '@reduxjs/toolkit'
import type { WalletState } from '../types/wallet.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type WalletRootState = { wallet: WalletState }

const selectItems = (state: WalletRootState) => state.wallet.list.items
const selectFilters = (state: WalletRootState) => state.wallet.filters

export const selectWalletListStatus = (state: WalletRootState) => state.wallet.list.status
export const selectWalletListError = (state: WalletRootState) => state.wallet.list.error
export const selectWalletMeta = (state: WalletRootState) => state.wallet.list.meta
export const selectWalletPage = (state: WalletRootState) => state.wallet.list.page
export const selectWalletSummary = (state: WalletRootState) => state.wallet.summary.data
export const selectWalletSummaryStatus = (state: WalletRootState) => state.wallet.summary.status
export const selectWalletInvoices = (state: WalletRootState) => state.wallet.invoices
export const selectSelectedCustomer = (state: WalletRootState) => state.wallet.selectedCustomer

// true cuando POST /wallet/summary falló (hoy responde 500 en el backend): las tarjetas muestran "No disponible" en vez de $0
export const selectWalletSummaryFailed = (state: WalletRootState) => state.wallet.summary.status === 'failed'

// totales de las tarjetas de arriba (0 mientras llegan)
export const selectWalletKpis = createSelector([selectWalletSummary], (summary) => ({
  totalReceivable: summary?.totalOutstandingDebt ?? 0,
  customersOverdue: summary?.customersOverdue ?? 0,
  totalLimit: summary?.totalCreditExtended ?? 0,
  customersWithCredit: summary?.totalCustomersWithCredit ?? 0,
  averageCreditDays: summary?.averageCreditDays ?? 0,
}))

// Filtrado reactivo de clientes (texto y estado) sobre la página cargada
export const selectFilteredCustomers = createSelector([selectItems, selectFilters], (customers, filters) => {
  const query = filters.searchQuery.toLowerCase().trim()
  return customers.filter((customer) => {
    if (query && !customer.documentId.toLowerCase().includes(query) && !customer.businessName.toLowerCase().includes(query)) return false
    if (filters.statusFilter !== 'all' && customer.creditStatus !== filters.statusFilter) return false
    return true
  })
})

// datos del encabezado del panel derecho cuando muestra el estado de cuenta del cliente seleccionado
export const selectAccountDrawerMeta = createSelector([selectSelectedCustomer], (customer) =>
  customer
    ? { tag: 'Estado de cuenta', title: customer.businessName, subtitle: `Documento: ${customer.documentId}` }
    : { title: 'Estado de cuenta' }
)

// true si hay un cliente seleccionado (el panel derecho solo se abre en ese caso)
export const selectHasSelectedCustomer = (state: WalletRootState) => state.wallet.selectedCustomer !== null
