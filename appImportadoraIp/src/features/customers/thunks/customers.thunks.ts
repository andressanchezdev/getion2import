// customers.thunks · carga la lista paginada de clientes y el detalle de uno
// conecta con: customers.service (llamadas), auth (selectRequestContext) y customers.slice (reacciona); las despachan useCustomersLoader y useSelectedCustomerData
// ojo: igual que en productos, cada carga lleva su requestId y el slice descarta las respuestas de cargas anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { CUSTOMERS_PAGE_SIZE } from '../constants/customers.constants'
import { fetchCustomerDetail, fetchCustomersPage } from '../services/customers.service'
import type { Customer, CustomerDetail, CustomersState } from '../types/customers.types'

type ThunkState = { auth: AuthState; customers: CustomersState }

export interface CustomersResult {
  customers: Customer[]
  meta: PaginatorMetadata
}

// lee la página actual del slice (no se pasa por argumento: así un cambio de página y la carga siempre van de acuerdo)
export const loadCustomersThunk = createAsyncThunk<CustomersResult, void, { state: ThunkState; rejectValue: string }>(
  'customers/loadList',
  async (_, { getState, rejectWithValue }) => {
    const state = getState()
    const ctx = selectRequestContext(state)
    if (!ctx) return rejectWithValue('No hay una sesión activa.')
    try {
      const page = await fetchCustomersPage(ctx, state.customers.list.page, CUSTOMERS_PAGE_SIZE)
      return { customers: page.items, meta: page.meta }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los clientes.'))
    }
  }
)

export const loadCustomerDetailThunk = createAsyncThunk<CustomerDetail, number, { rejectValue: string }>(
  'customers/loadDetail',
  async (customerId, { rejectWithValue }) => {
    try {
      return await fetchCustomerDetail(customerId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el cliente.'))
    }
  }
)
