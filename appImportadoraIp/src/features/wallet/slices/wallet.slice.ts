// wallet.slice · estado de cartera que viene del backend: lista paginada, totales, filtros, cliente abierto y sus facturas
// conecta con: wallet.thunks y wallet.payments.thunks (lo llenan), wallet.selectors (lecturas), WalletScreen, CreditClientsTable, CreditAccountDrawer y rootReducer (clave 'wallet'; ya NO se guarda en el navegador)
// ojo: antes los clientes eran de ejemplo y el abono se sumaba aquí a mano (registerPayment); ahora el saldo lo calcula el backend y se vuelve a leer
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_WALLET_STATE } from '../constants/wallet.constants'
import { loadInvoicesThunk, loadWalletSummaryThunk, loadWalletThunk } from '../thunks/wallet.thunks'
import { payThunk, updateCreditThunk } from '../thunks/wallet.payments.thunks'
import type { CreditStatus, CustomerCreditProfile } from '../types/wallet.types'

export const walletSlice = createSlice({
  name: 'wallet',
  initialState: INITIAL_WALLET_STATE,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.searchQuery = action.payload
    },
    setStatusFilter: (state, action: PayloadAction<'all' | CreditStatus>) => {
      state.filters.statusFilter = action.payload
    },
    resetFilters: (state) => {
      state.filters = INITIAL_WALLET_STATE.filters
    },
    setWalletPage: (state, action: PayloadAction<number>) => {
      state.list.page = Math.max(1, action.payload)
    },
    // abre el estado de cuenta de un cliente (o lo cierra con null); al cambiar de cliente se limpian las facturas del anterior
    setSelectedCustomer: (state, action: PayloadAction<CustomerCreditProfile | null>) => {
      if (state.selectedCustomer?.id !== action.payload?.id) state.invoices = INITIAL_WALLET_STATE.invoices
      state.selectedCustomer = action.payload
      state.isAccountDrawerOpen = action.payload !== null
    },
    setAccountDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isAccountDrawerOpen = action.payload
      if (!action.payload) {
        state.selectedCustomer = null
        state.invoices = INITIAL_WALLET_STATE.invoices
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // lista de clientes
      .addCase(loadWalletThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadWalletThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return // respuesta de una carga anterior: se descarta
        state.list.items = action.payload.customers
        state.list.meta = action.payload.meta
        state.list.status = 'succeeded'
        // si el cliente abierto viene en esta página se refrescan sus saldos (por ejemplo después de un abono)
        const fresh = action.payload.customers.find((customer) => customer.id === state.selectedCustomer?.id)
        if (fresh) state.selectedCustomer = fresh
      })
      .addCase(loadWalletThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudo cargar la cartera.'
      })
      // totales (KPIs)
      .addCase(loadWalletSummaryThunk.pending, (state) => {
        state.summary.status = 'loading'
        state.summary.error = null
      })
      .addCase(loadWalletSummaryThunk.fulfilled, (state, action) => {
        state.summary.data = action.payload
        state.summary.status = 'succeeded'
      })
      .addCase(loadWalletSummaryThunk.rejected, (state, action) => {
        state.summary.status = 'failed'
        state.summary.error = action.payload ?? 'No se pudieron cargar los totales de cartera.'
      })
      // facturas del cliente abierto
      .addCase(loadInvoicesThunk.pending, (state) => {
        state.invoices.status = 'loading'
        state.invoices.error = null
      })
      .addCase(loadInvoicesThunk.fulfilled, (state, action) => {
        state.invoices.items = action.payload
        state.invoices.status = 'succeeded'
      })
      .addCase(loadInvoicesThunk.rejected, (state, action) => {
        state.invoices.status = 'failed'
        state.invoices.error = action.payload ?? 'No se pudieron cargar las facturas.'
      })
      // abonos y cambio de cupo: mientras uno corre no se acepta otro
      .addCase(payThunk.pending, (state) => {
        state.invoices.saving = true
      })
      .addCase(payThunk.fulfilled, (state, action) => {
        state.invoices.saving = false
        state.invoices.items = action.payload
        state.invoices.status = 'succeeded'
      })
      .addCase(payThunk.rejected, (state) => {
        state.invoices.saving = false
      })
      .addCase(updateCreditThunk.pending, (state) => {
        state.invoices.saving = true
      })
      .addCase(updateCreditThunk.fulfilled, (state) => {
        state.invoices.saving = false
      })
      .addCase(updateCreditThunk.rejected, (state) => {
        state.invoices.saving = false
      })
      // al cerrar sesión se olvida todo lo de este usuario (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_WALLET_STATE
      )
  },
})

export const { setSearchQuery, setStatusFilter, resetFilters, setWalletPage, setSelectedCustomer, setAccountDrawerOpen } =
  walletSlice.actions
export const walletReducer = walletSlice.reducer
export default walletSlice.reducer
