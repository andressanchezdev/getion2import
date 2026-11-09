// cashExpenses.adapter · convierte los gastos de caja de la API a lo que usa la tabla y arma los parámetros del filtro
// conecta con: cashExpenses.service (los usa) y la tabla; con pruebas en cashExpenses.adapter.test.ts
import type { CashExpenseDto, CashExpenseFilters, CashExpenseRecord } from '../types/cashExpenses.types'

export const EXPENSE_TYPE_LABEL: Record<string, string> = {
  merchandise_arrival: 'Recepción de compra',
  payroll: 'Nómina',
  loans: 'Préstamos',
  overtime: 'Horas extra',
  cleaning_supplies: 'Aseo',
  services: 'Servicios',
  other: 'Gasto de caja',
}

export const INITIAL_CASH_EXPENSE_FILTERS: CashExpenseFilters = { query: '', warehouseId: 'all', from: '', to: '' }

export const toCashExpenseRecord = (dto: CashExpenseDto): CashExpenseRecord => ({
  id: dto.id,
  warehouseId: dto.warehouseId,
  warehouseName: dto.warehouseName,
  typeLabel: EXPENSE_TYPE_LABEL[dto.expenseType] ?? 'Gasto de caja',
  isPurchase: dto.purchaseId !== undefined && dto.purchaseId !== null,
  receiptNumber: dto.receiptNumber ?? '',
  concept: dto.concept,
  purchaseCode: dto.purchaseCode ?? '',
  supplierName: dto.supplierName ?? '',
  paidBy: dto.paidBy,
  closedAt: dto.closedAt,
  total: dto.total,
})

// parámetros de GET /cash/expenses: solo los filtros que de verdad están puestos
export const toExpenseParams = (filters: CashExpenseFilters, page: number): Record<string, string | number> => ({
  page,
  pageSize: 20,
  ...(filters.query.trim() ? { q: filters.query.trim() } : {}),
  ...(filters.warehouseId !== 'all' ? { warehouseId: Number(filters.warehouseId) } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
})

export const hasCashExpenseFilters = (filters: CashExpenseFilters): boolean =>
  filters.query !== '' || filters.warehouseId !== 'all' || filters.from !== '' || filters.to !== ''
