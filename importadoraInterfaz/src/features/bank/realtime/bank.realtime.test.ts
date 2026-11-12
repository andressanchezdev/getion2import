// bank.realtime.test · los eventos de conciliación actualizan la tabla y los pagos por verificar sin recargar
import { describe, expect, it } from 'vitest'
import { INITIAL_BANK_STATE } from '../constants/bank.constants'
import { bankRecordStatusFromEvent, bankSlice, pendingPaymentAddedFromEvent, pendingPaymentRemovedFromEvent } from '../slices/bank.slice'
import type { BankRecord, PendingPayment } from '../types/bank.types'

const reducer = bankSlice.reducer
const record: BankRecord = { id: 1, bank: 'Bancolombia', account: '014', date: '2026-11-10', description: 'Transferencia', channel: '', reference: '', document: '', amount: 50000, isIncome: true, status: 'pending', confirmedBy: '', confirmedAt: '', notes: '' }
const payment: PendingPayment = { id: 9, serial: 'PAG-9', saleSerial: 'PED-3', customerName: 'Ana', amount: 50000, reference: '', proofUrl: '', createdAt: '2026-11-12' }
const loaded = { ...INITIAL_BANK_STATE, list: { ...INITIAL_BANK_STATE.list, items: [record] }, pendingPayments: { items: [payment], status: 'succeeded' as const, error: null } }
const confirmed = bankRecordStatusFromEvent({ id: 1, to: 'confirmed', by: 'Pedro', at: '2026-11-12T10:00:00Z', paymentId: 9 })

describe('banco en tiempo real', () => {
  it('confirmar cambia la fila, anota quién y saca el pago ligado de los pendientes', () => {
    const all = { ...loaded, list: { ...loaded.list, filters: { ...loaded.list.filters, status: 'all' as const } } }
    const state = reducer(all, confirmed)
    expect(state.list.items[0]).toMatchObject({ status: 'confirmed', confirmedBy: 'Pedro' })
    expect(state.pendingPayments.items).toHaveLength(0)
  })
  it('con el filtro en «pendientes» la fila confirmada sale de la tabla', () => {
    const filtered = { ...loaded, list: { ...loaded.list, filters: { ...loaded.list.filters, status: 'pending' as const } } }
    expect(reducer(filtered, confirmed).list.items).toHaveLength(0)
  })
  it('un pago nuevo entra una sola vez y solo si la lista ya estaba cargada', () => {
    const other = { ...payment, id: 10 }
    const state = reducer(reducer(loaded, pendingPaymentAddedFromEvent(other)), pendingPaymentAddedFromEvent(other))
    expect(state.pendingPayments.items.map((p) => p.id)).toEqual([10, 9])
    expect(reducer(INITIAL_BANK_STATE, pendingPaymentAddedFromEvent(other)).pendingPayments.items).toHaveLength(0)
    expect(reducer(state, pendingPaymentRemovedFromEvent(10)).pendingPayments.items.map((p) => p.id)).toEqual([9])
  })
})
