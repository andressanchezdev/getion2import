// customers.thunks.test · pruebas de la carga de clientes, su detalle, direcciones y descuentos (con el slice real)
// conecta con: customers.thunks, customers.details.thunks y customers.slice; los services, la sesión y las alertas están simulados (no hay red)
import { configureStore, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '@/features/auth'
import { toast } from '@/global/helpers/toast'
import { customersReducer, selectCustomer, setCustomersPage } from '../slices/customers.slice'
import { loadCustomerDetailThunk, loadCustomersThunk } from './customers.thunks'
import {
  addDirectionThunk,
  deleteDirectionThunk,
  deleteDiscountThunk,
  loadDirectionsThunk,
  loadDiscountsThunk,
} from './customers.details.thunks'
import { fetchCustomerDetail, fetchCustomersPage } from '../services/customers.service'
import { addDirection, deleteDirection, deleteDiscount, fetchDirections, fetchDiscounts } from '../services/customers.details.service'
import type { CustomerDetail, CustomersState, Direction, Discount } from '../types/customers.types'

vi.mock('../services/customers.service', () => ({ fetchCustomersPage: vi.fn(), fetchCustomerDetail: vi.fn() }))
vi.mock('../services/customers.details.service', () => ({
  fetchDirections: vi.fn(),
  addDirection: vi.fn(),
  deleteDirection: vi.fn(),
  fetchDiscounts: vi.fn(),
  deleteDiscount: vi.fn(),
}))
vi.mock('@/global/helpers/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/auth', () => ({
  selectRequestContext: (state: { auth: { ctx: unknown } }) => state.auth.ctx,
}))

const ctx = { companyId: 3, userId: 7 }
const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

// ojo: el dispatch se tipa a mano para aceptar thunks que leen state.auth (el store de prueba solo tiene los slices que se prueban)
const makeStore = (sessionCtx: unknown = ctx) => {
  const store = configureStore({
    reducer: { auth: (state = { ctx: sessionCtx } as unknown as AuthState) => state, customers: customersReducer },
  })
  const dispatch = store.dispatch as unknown as ThunkDispatch<{ auth: AuthState; customers: CustomersState }, undefined, UnknownAction>
  return { store, dispatch }
}

const customer = { id: 5, name: 'Ana', lastName: 'P', fullName: 'Ana P', identification: '1', email: '', photo: '', userType: '', businessName: '' }
const detail: CustomerDetail = {
  ...customer,
  company: {
    businessName: '', tradeName: '', corporateName: '', nit: '', address: '', cityAndDepartment: '', email: '',
    customerType: '', personType: '', regimeType: '', legalRepresentative: '', mailInvoicing: '',
  },
}
const direction: Direction = { id: 1, address: 'Calle 1', neighborhood: '', city: 'Cali', department: '', country: '', additionalInfo: '' }
const discount: Discount = { id: 2, quantity: 0, price: 0, rate: 10, isActive: true }
const input = { address: 'Calle 1', neighborhood: '', city: 'Cali', department: '', country: 'Colombia', additionalInfo: '' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCustomersPage).mockResolvedValue({ items: [customer], meta })
  vi.mocked(fetchCustomerDetail).mockResolvedValue(detail)
  vi.mocked(fetchDirections).mockResolvedValue([direction])
  vi.mocked(fetchDiscounts).mockResolvedValue([discount])
  vi.mocked(addDirection).mockResolvedValue(undefined)
  vi.mocked(deleteDirection).mockResolvedValue(undefined)
  vi.mocked(deleteDiscount).mockResolvedValue(undefined)
})

describe('loadCustomersThunk', () => {
  it('pide la página actual con el contexto de la sesión y guarda clientes y meta', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(setCustomersPage(2))
    await dispatch(loadCustomersThunk())
    expect(fetchCustomersPage).toHaveBeenCalledWith(ctx, 2, 30)
    expect(store.getState().customers.list).toMatchObject({ status: 'succeeded', meta })
    expect(store.getState().customers.list.items).toHaveLength(1)
  })

  it('si falla deja el mensaje y el estado "failed"', async () => {
    vi.mocked(fetchCustomersPage).mockRejectedValue({ userFriendlyMessage: 'Servidor caído' })
    const { store, dispatch } = makeStore()
    await dispatch(loadCustomersThunk())
    expect(store.getState().customers.list).toMatchObject({ status: 'failed', error: 'Servidor caído' })
  })

  it('sin sesión no llama al backend', async () => {
    const { store, dispatch } = makeStore(null)
    await dispatch(loadCustomersThunk())
    expect(fetchCustomersPage).not.toHaveBeenCalled()
    expect(store.getState().customers.list.status).toBe('failed')
  })

  it('si llegan dos cargas seguidas se queda con la última aunque la primera termine después', async () => {
    let releaseFirst: (value: { items: never[]; meta: typeof meta }) => void = () => undefined
    vi.mocked(fetchCustomersPage).mockReturnValueOnce(new Promise((resolve) => (releaseFirst = resolve))).mockResolvedValueOnce({ items: [customer], meta })
    const { store, dispatch } = makeStore()
    const first = dispatch(loadCustomersThunk())
    await dispatch(loadCustomersThunk())
    releaseFirst({ items: [], meta })
    await first
    expect(store.getState().customers.list.items).toHaveLength(1)
  })
})

describe('detalle, direcciones y descuentos', () => {
  it('guarda el detalle del cliente', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(loadCustomerDetailThunk(5))
    expect(fetchCustomerDetail).toHaveBeenCalledWith(5)
    expect(store.getState().customers.detail).toMatchObject({ status: 'succeeded', data: { id: 5 } })
  })

  it('carga direcciones y descuentos', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(loadDirectionsThunk(5))
    await dispatch(loadDiscountsThunk(5))
    expect(store.getState().customers.directions.items).toEqual([direction])
    expect(store.getState().customers.discounts.items).toEqual([discount])
  })

  it('agregar una dirección la crea, relee la lista y avisa', async () => {
    const { store, dispatch } = makeStore()
    await dispatch(addDirectionThunk({ customerId: 5, input }))
    expect(addDirection).toHaveBeenCalledWith(5, input)
    expect(fetchDirections).toHaveBeenCalledWith(5)
    expect(store.getState().customers.directions).toMatchObject({ saving: false, items: [direction] })
    expect(toast.success).toHaveBeenCalled()
  })

  it('un error al agregar avisa y no deja el panel bloqueado', async () => {
    vi.mocked(addDirection).mockRejectedValue({ userFriendlyMessage: 'Datos inválidos' })
    const { store, dispatch } = makeStore()
    await dispatch(addDirectionThunk({ customerId: 5, input }))
    expect(toast.error).toHaveBeenCalledWith('Datos inválidos')
    expect(store.getState().customers.directions.saving).toBe(false)
  })

  it('no acepta otro cambio de direcciones mientras uno está en curso', async () => {
    let release: () => void = () => undefined
    vi.mocked(addDirection).mockReturnValue(new Promise<void>((resolve) => (release = resolve)))
    const { store, dispatch } = makeStore()
    const first = dispatch(addDirectionThunk({ customerId: 5, input }))
    expect(store.getState().customers.directions.saving).toBe(true)
    await dispatch(deleteDirectionThunk({ customerId: 5, directionId: 1 })) // ignorado
    release()
    await first
    expect(deleteDirection).not.toHaveBeenCalled()
  })

  it('borrar una dirección y borrar un descuento releen su lista', async () => {
    vi.mocked(fetchDirections).mockResolvedValue([])
    vi.mocked(fetchDiscounts).mockResolvedValue([])
    const { store, dispatch } = makeStore()
    await dispatch(deleteDirectionThunk({ customerId: 5, directionId: 1 }))
    await dispatch(deleteDiscountThunk({ customerId: 5, discountId: 2 }))
    expect(deleteDirection).toHaveBeenCalledWith(1)
    expect(deleteDiscount).toHaveBeenCalledWith(2)
    expect(store.getState().customers.directions.items).toEqual([])
    expect(store.getState().customers.discounts.items).toEqual([])
  })

  it('abrir otro cliente limpia el detalle, las direcciones y los descuentos del anterior', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(selectCustomer(5))
    await dispatch(loadCustomerDetailThunk(5))
    await dispatch(loadDirectionsThunk(5))
    store.dispatch(selectCustomer(6))
    expect(store.getState().customers.detail.data).toBeNull()
    expect(store.getState().customers.directions.items).toEqual([])
    expect(store.getState().customers.selectedId).toBe(6)
  })

  it('cerrar sesión borra todo lo de clientes', async () => {
    const { store, dispatch } = makeStore()
    store.dispatch(selectCustomer(5))
    await dispatch(loadCustomersThunk())
    store.dispatch({ type: 'auth/logout/fulfilled' })
    expect(store.getState().customers.list.items).toEqual([])
    expect(store.getState().customers.selectedId).toBeNull()
  })
})
