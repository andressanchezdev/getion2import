// cashExpenses.adapter.test · pruebas de la conversión de los gastos de caja y de los parámetros del filtro
// conecta con: cashExpenses.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_CASH_EXPENSE_FILTERS, hasCashExpenseFilters, toCashExpenseRecord, toExpenseParams } from './cashExpenses.adapter'
import type { CashExpenseDto } from '../types/cashExpenses.types'

const dto = (over: Partial<CashExpenseDto> = {}): CashExpenseDto => ({
  id: 1, sessionId: 2, warehouseId: 3, warehouseName: 'Bodega A', expenseType: 'merchandise_arrival', concept: 'Recepción OC-1', cashAmount: 20000, total: 20000, paidBy: 'Ana', closedAt: '2026-11-08T10:00:00Z', ...over,
})

describe('toCashExpenseRecord', () => {
  it('un pago de recepción trae la orden y el proveedor y se marca como compra', () => {
    const record = toCashExpenseRecord(dto({ purchaseId: 9, purchaseCode: 'OC-1', supplierName: 'Proveedor X', receiptNumber: 'FAC-1' }))
    expect(record).toMatchObject({ isPurchase: true, typeLabel: 'Recepción de compra', purchaseCode: 'OC-1', supplierName: 'Proveedor X', receiptNumber: 'FAC-1', total: 20000 })
  })

  it('un gasto menor no tiene orden ni proveedor', () => {
    expect(toCashExpenseRecord(dto({ expenseType: 'other', concept: 'Domicilio' }))).toMatchObject({ isPurchase: false, typeLabel: 'Gasto de caja', purchaseCode: '', supplierName: '' })
  })
})

describe('filtros', () => {
  it('solo manda los filtros puestos', () => {
    expect(toExpenseParams(INITIAL_CASH_EXPENSE_FILTERS, 1)).toEqual({ page: 1, pageSize: 20 })
    expect(toExpenseParams({ query: ' flete ', warehouseId: '4', from: '2026-11-01', to: '2026-11-08' }, 2)).toEqual({ page: 2, pageSize: 20, q: 'flete', warehouseId: 4, from: '2026-11-01', to: '2026-11-08' })
  })

  it('dice si hay algún filtro puesto', () => {
    expect(hasCashExpenseFilters(INITIAL_CASH_EXPENSE_FILTERS)).toBe(false)
    expect(hasCashExpenseFilters({ ...INITIAL_CASH_EXPENSE_FILTERS, from: '2026-11-01' })).toBe(true)
  })
})
