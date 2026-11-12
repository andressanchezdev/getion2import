// wallet.realtime.test · los eventos de pagos y cartera dejan al día historial, cliente y facturas sin pedir nada al backend
import { describe, expect, it } from 'vitest'
import { INITIAL_WALLET_STATE } from '../constants/wallet.constants'
import { creditBalanceFromEvent, invoicePaymentFromEvent, paymentCreatedFromEvent, paymentStatusFromEvent, walletSlice } from '../slices/wallet.slice'
import type { AbonoRecord, CreditInvoice, CustomerCreditProfile } from '../types/wallet.types'

const reducer = walletSlice.reducer
const abono: AbonoRecord = { id: 9, serialCode: 'PAG-9', date: '2026-11-12', customerName: 'Ana', customerDoc: '123', method: 'transfer', amount: 50000, status: 'pending' }
const customer: CustomerCreditProfile = { id: 4, documentId: '123', businessName: 'Ana', creditDays: 30, isCredit: true, creditLimit: 1000, usedCredit: 0, reservedCredit: 0, availableCredit: 1000, creditStatus: 'upToDate' }
const invoice: CreditInvoice = { id: '70', saleId: 70, invoiceNumber: '#70', orderNumber: 'Pedido 70', issueDate: '2026-11-01', dueDate: '2026-12-01', totalAmount: 300, paidAmount: 0, pendingBalance: 300, daysOverdue: 0, status: 'current' }
const loadedHistory = { ...INITIAL_WALLET_STATE, history: { ...INITIAL_WALLET_STATE.history, status: 'succeeded' as const, items: [] as AbonoRecord[] } }

describe('wallet en tiempo real', () => {
  it('payment.created entra al historial cargado una sola vez; sin cargar no hace nada', () => {
    const once = reducer(loadedHistory, paymentCreatedFromEvent(abono))
    const twice = reducer(once, paymentCreatedFromEvent({ ...abono, amount: 60000 }))
    expect(twice.history.items).toHaveLength(1)
    expect(twice.history.items[0].amount).toBe(60000)
    expect(reducer(INITIAL_WALLET_STATE, paymentCreatedFromEvent(abono)).history.items).toHaveLength(0)
  })
  it('payment.status_changed cambia el estado y quién verificó', () => {
    const state = reducer({ ...loadedHistory, history: { ...loadedHistory.history, items: [abono] } }, paymentStatusFromEvent({ id: 9, status: 'verified', verifiedByName: 'Pedro' }))
    expect(state.history.items[0]).toMatchObject({ status: 'verified', verifiedByName: 'Pedro' })
  })
  it('credit.balance_changed actualiza la fila y el cliente abierto', () => {
    const base = { ...INITIAL_WALLET_STATE, list: { ...INITIAL_WALLET_STATE.list, items: [customer] }, selectedCustomer: customer }
    const state = reducer(base, creditBalanceFromEvent({ customerId: 4, creditLimit: 1000, available: 700 }))
    expect(state.list.items[0]).toMatchObject({ availableCredit: 700, usedCredit: 300, creditStatus: 'withBalance' })
    expect(state.selectedCustomer).toMatchObject({ availableCredit: 700, usedCredit: 300 })
  })
  it('sale.payment_changed baja el saldo de la factura y la marca pagada al llegar a cero', () => {
    const base = { ...INITIAL_WALLET_STATE, invoices: { ...INITIAL_WALLET_STATE.invoices, items: [invoice] } }
    const partial = reducer(base, invoicePaymentFromEvent({ saleId: 70, paidTotal: 100 }))
    expect(partial.invoices.items[0]).toMatchObject({ paidAmount: 100, pendingBalance: 200, status: 'current' })
    expect(reducer(partial, invoicePaymentFromEvent({ saleId: 70, paidTotal: 300 })).invoices.items[0].status).toBe('paid')
  })
})
