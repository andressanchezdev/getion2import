// customers.manage.thunks.test · pruebas de crear, editar y revisar duplicados de clientes con thunks (los formularios ya no llaman al service)
// conecta con: customers.thunks; el service y la sesión están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { customersReducer } from '../slices/customers.slice'
import { createCustomerThunk, customerExistsThunk, updateCustomerThunk } from './customers.thunks'
import { createCustomer, customerExists, updateCustomer } from '../services/customers.service'
import type { Customer } from '../types/customers.types'

vi.mock('../services/customers.service', () => ({
  fetchCustomersPage: vi.fn(),
  fetchCustomerDetail: vi.fn(),
  deleteCustomer: vi.fn(),
  createCustomer: vi.fn(),
  customerExists: vi.fn(),
  updateCustomer: vi.fn(),
}))
vi.mock('@/features/auth', () => ({ selectRequestContext: () => ({ companyId: 3, userId: 7 }) }))

const makeStore = () => {
  const store = configureStore({ reducer: { auth: (state = {} as AuthState) => state, customers: customersReducer } })
  return store.dispatch as ThunkDispatch<unknown, unknown, UnknownAction>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('customerExistsThunk', () => {
  it('devuelve si ya existe el documento o el correo', async () => {
    vi.mocked(customerExists).mockResolvedValue(true)
    const result = await makeStore()(customerExistsThunk({ field: 'email', value: 'a@b.co' }))
    expect(customerExists).toHaveBeenCalledWith('email', 'a@b.co')
    expect(result.payload).toBe(true)
  })

  it('si falla rechaza con un texto para mostrar', async () => {
    vi.mocked(customerExists).mockRejectedValue(new Error('sin red'))
    const result = await makeStore()(customerExistsThunk({ field: 'document', value: '123456' }))
    expect(result.type).toContain('rejected')
    expect(typeof result.payload).toBe('string')
  })
})

describe('createCustomerThunk', () => {
  it('crea el cliente con el cuerpo recibido', async () => {
    vi.mocked(createCustomer).mockResolvedValue({ id: 9 } as Customer)
    const body = { documentType: 'CC', document: '1020', personType: 'natural', name: 'Ana', phone: '3001234567' } as Parameters<typeof createCustomer>[0]
    const result = await makeStore()(createCustomerThunk(body))
    expect(createCustomer).toHaveBeenCalledWith(body)
    expect(result.payload).toMatchObject({ id: 9 })
  })

  it('si falla rechaza con el mensaje', async () => {
    vi.mocked(createCustomer).mockRejectedValue(new Error('duplicado'))
    const result = await makeStore()(createCustomerThunk({} as Parameters<typeof createCustomer>[0]))
    expect(result.type).toContain('rejected')
    expect(typeof result.payload).toBe('string')
  })
})

describe('updateCustomerThunk', () => {
  it('guarda los cambios del cliente', async () => {
    vi.mocked(updateCustomer).mockResolvedValue(undefined)
    const result = await makeStore()(updateCustomerThunk({ id: 4, body: { name: 'Ana', phone: '300', email: 'a@b.co' } }))
    expect(updateCustomer).toHaveBeenCalledWith(4, { name: 'Ana', phone: '300', email: 'a@b.co' })
    expect(result.type).toContain('fulfilled')
  })
})
