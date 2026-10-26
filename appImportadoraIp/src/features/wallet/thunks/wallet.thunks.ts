// wallet.thunks · carga la lista de clientes con crédito, los totales (KPIs) y las facturas de un cliente
// conecta con: wallet.service (llamadas), auth (selectRequestContext), navigation (bodega activa) y wallet.slice (reacciona); las despachan useWalletLoader y useAccountData
// ojo: la lista y las facturas llevan su requestId/estado y el slice descarta respuestas viejas; la bodega activa viaja como número y se omite si todavía no hay
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { toWarehouseNumber } from '@/global/helpers/warehouse'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { WALLET_PAGE_SIZE } from '../constants/wallet.constants'
import { fetchCustomerInvoices, fetchWalletPage, fetchWalletSummary } from '../services/wallet.service'
import type { CreditInvoice, CustomerCreditProfile, WalletState, WalletSummary } from '../types/wallet.types'

export type WalletThunkState = { auth: AuthState; ui: NavigationState; wallet: WalletState }
export type WalletThunkConfig = { state: WalletThunkState; rejectValue: string }

export const NO_SESSION = 'No hay una sesión activa.'

export interface WalletListResult {
  customers: CustomerCreditProfile[]
  meta: PaginatorMetadata
}

// lee la página actual del slice (así un cambio de página y la carga siempre van de acuerdo)
export const loadWalletThunk = createAsyncThunk<WalletListResult, void, WalletThunkConfig>(
  'wallet/loadList',
  async (_, { getState, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      const page = await fetchWalletPage(ctx, state.wallet.list.page, WALLET_PAGE_SIZE, toWarehouseNumber(state.ui.activeWarehouseId))
      return { customers: page.items, meta: page.meta }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la cartera.'))
    }
  }
)

export const loadWalletSummaryThunk = createAsyncThunk<WalletSummary, void, WalletThunkConfig>(
  'wallet/loadSummary',
  async (_, { getState, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return await fetchWalletSummary(ctx, toWarehouseNumber(state.ui.activeWarehouseId))
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los totales de cartera.'))
    }
  }
)

export const loadInvoicesThunk = createAsyncThunk<CreditInvoice[], number, WalletThunkConfig>(
  'wallet/loadInvoices',
  async (customerId, { getState, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      const days = state.wallet.list.items.find((item) => item.id === customerId)?.creditDays ?? 0
      return await fetchCustomerInvoices(ctx, customerId, toWarehouseNumber(state.ui.activeWarehouseId), days)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las facturas.'))
    }
  }
)
