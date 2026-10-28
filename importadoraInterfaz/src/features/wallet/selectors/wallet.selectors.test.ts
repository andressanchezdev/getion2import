// wallet.selectors.test · pruebas de los totales (KPIs), el filtro de clientes y el encabezado del panel
// conecta con: wallet.selectors; no usa red ni store real
import { describe, expect, it } from 'vitest'
import { INITIAL_WALLET_STATE } from '../constants/wallet.constants'
import { selectAccountDrawerMeta, selectFilteredCustomers, selectHasSelectedCustomer, selectWalletKpis } from './wallet.selectors'
import type { CustomerCreditProfile, WalletState } from '../types/wallet.types'

const customer = (id: number, businessName: string, documentId: string, creditStatus: CustomerCreditProfile['creditStatus']): CustomerCreditProfile => ({
  id, documentId, businessName, creditDays: 30, isCredit: creditStatus !== 'blocked',
  creditLimit: 100, usedCredit: 0, reservedCredit: 0, availableCredit: 100, creditStatus,
})

const stateWith = (patch: (state: WalletState) => WalletState) => ({ wallet: patch(INITIAL_WALLET_STATE) })

describe('selectWalletKpis', () => {
  it('sin totales todo es 0', () => {
    expect(selectWalletKpis(stateWith((s) => s))).toEqual({
      totalReceivable: 0, customersOverdue: 0, totalLimit: 0, customersWithCredit: 0, averageCreditDays: 0,
    })
  })

  it('toma los valores del resumen del backend', () => {
    const state = stateWith((s) => ({
      ...s,
      summary: {
        status: 'succeeded', error: null,
        data: { totalCreditExtended: 900, totalOutstandingDebt: 300, totalAvailableCredit: 600, customersOverdue: 2, totalCustomersWithCredit: 5, averageCreditDays: 21 },
      },
    }))
    expect(selectWalletKpis(state)).toEqual({ totalReceivable: 300, customersOverdue: 2, totalLimit: 900, customersWithCredit: 5, averageCreditDays: 21 })
  })
})

describe('selectFilteredCustomers', () => {
  const items = [customer(1, 'Ana Pérez', '111', 'upToDate'), customer(2, 'Luis Gómez', '222', 'withBalance'), customer(3, 'Marta Ruiz', '333', 'blocked')]
  const make = (filters: Partial<WalletState['filters']>) =>
    stateWith((s) => ({ ...s, list: { ...s.list, items }, filters: { ...s.filters, ...filters } }))

  it('sin filtros devuelve todos', () => {
    expect(selectFilteredCustomers(make({}))).toHaveLength(3)
  })

  it('busca por nombre o documento', () => {
    expect(selectFilteredCustomers(make({ searchQuery: 'gómez' })).map((c) => c.id)).toEqual([2])
    expect(selectFilteredCustomers(make({ searchQuery: '333' })).map((c) => c.id)).toEqual([3])
  })

  it('filtra por estado', () => {
    expect(selectFilteredCustomers(make({ statusFilter: 'blocked' })).map((c) => c.id)).toEqual([3])
  })

  it('combina texto y estado', () => {
    expect(selectFilteredCustomers(make({ searchQuery: 'ana', statusFilter: 'withBalance' }))).toEqual([])
  })
})

describe('panel del cliente', () => {
  it('sin cliente seleccionado el título es "Estado de cuenta" y el panel no se abre', () => {
    const state = stateWith((s) => s)
    expect(selectAccountDrawerMeta(state)).toEqual({ title: 'Estado de cuenta' })
    expect(selectHasSelectedCustomer(state)).toBe(false)
  })

  it('con cliente muestra su nombre y documento', () => {
    const state = stateWith((s) => ({ ...s, selectedCustomer: customer(1, 'Ana Pérez', '111', 'upToDate') }))
    expect(selectAccountDrawerMeta(state)).toEqual({ tag: 'Estado de cuenta', title: 'Ana Pérez', subtitle: 'Documento: 111' })
    expect(selectHasSelectedCustomer(state)).toBe(true)
  })
})
