// customers.thunks · carga la lista paginada de clientes y el detalle de uno; revisa si un documento o correo ya existe; crea, edita y elimina
// conecta con: customers.service (llamadas), auth (selectRequestContext) y customers.slice (reacciona); las despachan useCustomersLoader y useSelectedCustomerData
// ojo: igual que en productos, cada carga lleva su requestId y el slice descarta las respuestas de cargas anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { CUSTOMERS_PAGE_SIZE } from '../constants/customers.constants'
import { createCustomer, customerExists, deleteCustomer, fetchCustomerDetail, fetchCustomersPage, updateCustomer } from '../services/customers.service'
import type { CreateCustomerBody, UpdateCustomerBody } from '../types/customers.api.types'
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
      const page = await fetchCustomersPage(ctx, state.customers.list.page, CUSTOMERS_PAGE_SIZE, state.customers.list.query)
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

// elimina un cliente y devuelve su id (el slice cierra su panel si estaba abierto y la pantalla vuelve a pedir la lista)
export const deleteCustomerThunk = createAsyncThunk<number, number, { rejectValue: string }>(
  'customers/delete',
  async (customerId, { rejectWithValue }) => {
    try {
      await deleteCustomer(customerId)
      return customerId
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo eliminar el cliente.'))
    }
  }
)

// ¿ya existe un cliente con este documento o correo? (la validación asíncrona de los formularios)
export const customerExistsThunk = createAsyncThunk<boolean, { field: 'document' | 'email'; value: string }, { rejectValue: string }>('customers/exists', async ({ field, value }, { rejectWithValue }) => {
  try {
    return await customerExists(field, value)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo comprobar si el cliente ya existe.'))
  }
})

export const createCustomerThunk = createAsyncThunk<Customer, CreateCustomerBody, { rejectValue: string }>('customers/create', async (body, { rejectWithValue }) => {
  try {
    return await createCustomer(body)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Error al registrar el cliente'))
  }
})

export const updateCustomerThunk = createAsyncThunk<void, { id: number; body: UpdateCustomerBody }, { rejectValue: string }>('customers/update', async ({ id, body }, { rejectWithValue }) => {
  try {
    await updateCustomer(id, body)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Error al actualizar el cliente'))
  }
})
