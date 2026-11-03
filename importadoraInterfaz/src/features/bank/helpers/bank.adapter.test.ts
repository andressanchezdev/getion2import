import { describe, expect, it } from 'vitest'
import { candidatePayments, isExactMatch, summarizeRecords, toBankRecord, toPendingPayment, toUploadResult } from './bank.adapter'
import type { BankRecord, PendingPayment } from '../types/bank.types'

const record = (over: Partial<BankRecord> = {}): BankRecord => ({ id: 1, bank: 'Bancolombia', account: '014', date: '2026-10-28', description: 'PAGO QR', channel: 'LA PLAYA', reference: '', document: '', amount: 100000, isIncome: true, status: 'pending', confirmedBy: '', confirmedAt: '', notes: '', ...over })
const payment = (id: number, amount: number, reference = ''): PendingPayment => ({ id, serial: `PAG-${id}`, saleSerial: `PD-${id}`, customerName: 'Cliente', amount, reference, proofUrl: '', createdAt: '2026-10-28' })

describe('bank.adapter', () => {
  it('convierte un movimiento: fecha corta, primera referencia y estado desconocido como pendiente', () => {
    const converted = toBankRecord({ id: 5, bankName: ' Bancolombia ', accountNumber: '01400000369', movementDate: '2026-10-28T00:00:00Z', description: 'PAGO QR VICTOR', branchChannel: 'LA PLAYA', reference1: null, reference2: 'REF-9', amount: 446950, isIncome: true, status: 'raro' })
    expect(converted).toMatchObject({ bank: 'Bancolombia', date: '2026-10-28', reference: 'REF-9', status: 'pending', amount: 446950 })
  })

  it('convierte un pago por verificar y lo que respondió la subida del PDF', () => {
    expect(toPendingPayment({ id: 3, serialCode: 'PAG-3', saleSerial: 'PD-7', customerName: 'Ana', amount: 5000, createdAt: '2026-10-28' })).toMatchObject({ serial: 'PAG-3', reference: '', proofUrl: '' })
    expect(toUploadResult({ totalProcessed: 12, totalInserted: 9, accountInfo: ' Cta 014 ' })).toEqual({ processed: 12, inserted: 9, account: 'Cta 014' })
  })

  it('resume solo las entradas y separa lo pendiente de lo confirmado', () => {
    const summary = summarizeRecords([record({ amount: 100 }), record({ id: 2, amount: 200, status: 'confirmed' }), record({ id: 3, amount: 50, isIncome: false }), record({ id: 4, amount: 25, status: 'ignored' })])
    expect(summary).toEqual({ incomeCount: 3, incomeTotal: 325, pendingCount: 1, pendingTotal: 100, confirmedTotal: 200 })
  })

  it('propone primero el pago de la misma referencia y luego el de valor más cercano', () => {
    const list = candidatePayments(record({ amount: 100000, reference: 'CUS-123' }), [payment(1, 99000), payment(2, 100000), payment(3, 500000, 'CUS-123')])
    expect(list.map((p) => p.id)).toEqual([3, 2, 1])
  })

  it('sin referencia ordena por cercanía del valor y reconoce el valor exacto', () => {
    const base = record({ amount: 100000 })
    expect(candidatePayments(base, [payment(1, 90000), payment(2, 100000), payment(3, 150000)]).map((p) => p.id)).toEqual([2, 1, 3])
    expect(isExactMatch(base, payment(2, 100000))).toBe(true)
    expect(isExactMatch(base, payment(1, 90000))).toBe(false)
  })
})
