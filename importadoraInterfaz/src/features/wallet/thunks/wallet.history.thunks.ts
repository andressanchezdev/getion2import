// wallet.history.thunks · carga el historial de abonos y busca clientes para habilitarles crédito
// conecta con: wallet.service (llamadas), auth (selectRequestContext) y wallet.slice (reacciona); las despachan usePaymentsHistory y useCreditCustomerSearch
// ojo: cada carga lleva su requestId y el slice descarta las respuestas de pedidos anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext } from '@/features/auth'
import { fetchPaymentsHistory, searchCreditCustomers } from '../services/wallet.service'
import type { AbonoRecord, CreditCustomerOption } from '../types/wallet.types'
import { NO_SESSION, type WalletThunkConfig } from './wallet.thunks'

export const loadPaymentsHistoryThunk = createAsyncThunk<AbonoRecord[], void, WalletThunkConfig>('wallet/loadHistory', async (_, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchPaymentsHistory(ctx)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el historial de abonos.'))
  }
})

export const searchCreditCustomersThunk = createAsyncThunk<CreditCustomerOption[], { query: string; onlyCredit?: boolean }, WalletThunkConfig>('wallet/searchCreditCustomers', async ({ query, onlyCredit }, { rejectWithValue }) => {
  try {
    return await searchCreditCustomers(query, onlyCredit)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar los clientes.'))
  }
})
