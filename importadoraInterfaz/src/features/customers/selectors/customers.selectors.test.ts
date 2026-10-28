// customers.selectors.test · pruebas de la lista visible (búsqueda) y del encabezado del panel del cliente
// conecta con: customers.selectors; no usa red ni store real
import { describe, expect, it } from 'vitest'
import { INITIAL_CUSTOMERS_STATE } from '../constants/customers.constants'
import { selectCustomerDrawerMeta, selectHasOpenCustomer, selectVisibleCustomers } from './customers.selectors'
import type { Customer, CustomersState } from '../types/customers.types'

const customer = (id: number, fullName: string, identification: string, businessName = ''): Customer => ({
  id,
  name: fullName,
  lastName: '',
  fullName,
  identification,
  email: '',
  photo: '',
  userType: '',
  businessName,
})

const stateWith = (patch: Partial<CustomersState>) => ({
  customers: { ...INITIAL_CUSTOMERS_STATE, ...patch },
})

describe('selectVisibleCustomers', () => {
  const items = [customer(1, 'Ana Pérez', '111'), customer(2, 'Luis Gómez', '222')]

  it('sin texto muestra la lista cargada', () => {
    const state = stateWith({ list: { ...INITIAL_CUSTOMERS_STATE.list, items } })
    expect(selectVisibleCustomers(state)).toHaveLength(2)
  })

  it('con texto filtra sobre la página cargada', () => {
    const state = stateWith({ list: { ...INITIAL_CUSTOMERS_STATE.list, items, query: 'luis' } })
    expect(selectVisibleCustomers(state).map((c) => c.id)).toEqual([2])
  })
})

describe('selectHasOpenCustomer', () => {
  it('es true solo con un cliente abierto', () => {
    expect(selectHasOpenCustomer(stateWith({}))).toBe(false)
    expect(selectHasOpenCustomer(stateWith({ selectedId: 3 }))).toBe(true)
  })
})

describe('selectCustomerDrawerMeta', () => {
  const items = [customer(1, 'Ana Pérez', '111', 'Motos SAS')]

  it('usa los datos de la lista mientras llega el detalle', () => {
    const state = stateWith({ list: { ...INITIAL_CUSTOMERS_STATE.list, items }, selectedId: 1 })
    expect(selectCustomerDrawerMeta(state)).toEqual({ title: 'Ana Pérez', subtitle: 'Motos SAS', tag: '111' })
  })

  it('sin cliente conocido el título es "Cliente"', () => {
    expect(selectCustomerDrawerMeta(stateWith({ selectedId: 99 })).title).toBe('Cliente')
  })
})
