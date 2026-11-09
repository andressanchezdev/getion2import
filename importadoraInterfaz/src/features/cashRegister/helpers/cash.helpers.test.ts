// cash.helpers.test · pruebas del cierre (esperado y diferencias), de la limpieza de gastos y de la conversión del turno
// conecta con: cash.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import { cleanExpenses, computeClosing, toCashSession, toneOf } from './cash.helpers'
import type { CashExpense } from '../types/cash.types'

const expense = (over: Partial<CashExpense>): CashExpense => ({ receiptNumber: ' R-1 ', concept: ' Domicilio ', cashAmount: 8000, transferAmount: 2000, ...over })

describe('computeClosing', () => {
  const session = { expectedCash: 350_000, transferTotal: 120_000, abonosTotal: 80_000 }
  const declared = (cash: number, transfer = 0, abonos = 0) => ({ cash, transfer, abonos })

  it('el esperado es lo del turno (fondo + efectivo) menos los gastos en efectivo', () => {
    const result = computeClosing(session, [expense({}), expense({ cashAmount: 12_000, transferAmount: 0 })], declared(0))
    expect(result.expensesCash).toBe(20_000)
    expect(result.expensesTransfer).toBe(2000)
    expect(result.expectedCash).toBe(330_000)
  })

  it('la diferencia es contado - esperado y define el color', () => {
    expect(computeClosing(session, [], declared(350_000))).toMatchObject({ difference: 0, tone: 'balanced' })
    expect(computeClosing(session, [], declared(340_000))).toMatchObject({ difference: -10_000, tone: 'short' })
    expect(computeClosing(session, [], declared(360_000))).toMatchObject({ difference: 10_000, tone: 'over' })
  })

  it('un gasto sin concepto o sin monto no entra en el cálculo', () => {
    const result = computeClosing(session, [expense({ concept: '  ' }), expense({ cashAmount: 0, transferAmount: 0 })], declared(350_000))
    expect(result.expectedCash).toBe(350_000)
  })

  it('transferencias y abonos: la diferencia es lo declarado menos lo recibido', () => {
    expect(computeClosing(session, [], declared(350_000, 120_000, 80_000))).toMatchObject({ transferDifference: 0, abonosDifference: 0 })
    expect(computeClosing(session, [], declared(350_000, 100_000, 90_000))).toMatchObject({ transferDifference: -20_000, abonosDifference: 10_000 })
  })
})

describe('cleanExpenses y toneOf', () => {
  it('descarta los incompletos y recorta los textos', () => {
    expect(cleanExpenses([expense({}), expense({ concept: '' })])).toEqual([{ receiptNumber: 'R-1', concept: 'Domicilio', cashAmount: 8000, transferAmount: 2000 }])
  })

  it('toneOf', () => {
    expect([toneOf(0), toneOf(-1), toneOf(1)]).toEqual(['balanced', 'short', 'over'])
  })
})

describe('toCashSession', () => {
  it('rellena en cero lo que el turno abierto aún no trae', () => {
    const session = toCashSession({ id: 1, warehouseId: 2, status: 'open', openedByName: 'Ana', openedAt: '2026-11-01T08:00:00Z', openingAmount: 50_000, cashTotal: 100_000 })
    expect(session).toMatchObject({ transferTotal: 0, paymentsCount: 0, expensesCash: 0, expectedCash: 150_000, warehouseName: '' })
  })
})
