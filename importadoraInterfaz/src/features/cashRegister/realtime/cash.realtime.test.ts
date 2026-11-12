// cash.realtime.test · los totales del turno y su cierre llegan por evento, solo al turno que está en pantalla
import { describe, expect, it } from 'vitest'
import { cashReducer, cashSessionClosedFromEvent, cashTotalsFromEvent, INITIAL_CASH_STATE } from '../slices/cash.slice'
import type { CashSession } from '../types/cash.types'

const session: CashSession = { id: 64, warehouseId: 1, warehouseName: 'Principal', status: 'open', openedByName: 'Ana', openedAt: '2026-11-12T08:00:00Z', openingAmount: 200000, cashTotal: 0, transferTotal: 0, abonosTotal: 0, paymentsCount: 0, expensesCash: 0, expectedCash: 200000 }
const open = { ...INITIAL_CASH_STATE, warehouseId: 1, session }
const totals = { sessionId: 64, cashIn: 25000, transferIn: 50000, abonosIn: 40000, paymentsCount: 3, expenses: 12000, expectedCash: 213000 }

describe('caja en tiempo real', () => {
  it('cash_session.totals_changed deja al día los totales del turno abierto', () => {
    expect(cashReducer(open, cashTotalsFromEvent(totals)).session).toMatchObject({ cashTotal: 25000, transferTotal: 50000, abonosTotal: 40000, paymentsCount: 3, expensesCash: 12000, expectedCash: 213000 })
  })
  it('los totales de otro turno no tocan el de pantalla', () => {
    expect(cashReducer(open, cashTotalsFromEvent({ ...totals, sessionId: 99 })).session).toEqual(session)
  })
  it('el cierre del turno en pantalla lo quita; el de otro turno solo avisa a la lista de Facturas', () => {
    const mine = cashReducer(open, cashSessionClosedFromEvent(64))
    expect(mine.session).toBeNull()
    expect(mine.closedTick).toBe(1)
    const other = cashReducer(open, cashSessionClosedFromEvent(99))
    expect(other.session).toEqual(session)
    expect(other.closedTick).toBe(1)
  })
})
