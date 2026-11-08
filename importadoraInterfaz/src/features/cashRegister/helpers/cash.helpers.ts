// cash.helpers · funciones puras de caja: convertir el turno del backend, calcular el cierre en vivo y limpiar los gastos antes de enviarlos
// conecta con: cash.service (toCashSession), useCashClose (computeClosing y cleanExpenses) y CashClosePanel; no toca el store
import type { CashBalanceTone, CashClosing, CashExpense, CashSession, CashSessionDto, InvoiceLineItem, SaleItemDto } from '../types/cash.types'

// del backend a la app: lo que no viene se rellena en cero
export const toCashSession = (dto: CashSessionDto): CashSession => ({
  id: dto.id,
  warehouseId: dto.warehouseId,
  warehouseName: dto.warehouseName ?? '',
  status: dto.status,
  openedByName: dto.openedByName,
  openedAt: dto.openedAt,
  openingAmount: dto.openingAmount,
  cashTotal: dto.cashTotal ?? 0,
  transferTotal: dto.transferTotal ?? 0,
  abonosTotal: dto.abonosTotal ?? 0,
  paymentsCount: dto.paymentsCount ?? 0,
  expensesCash: dto.expensesCash ?? 0,
  expectedCash: dto.expectedCash ?? dto.openingAmount + (dto.cashTotal ?? 0),
  countedCash: dto.countedCash,
  difference: dto.difference,
  closedByName: dto.closedByName,
  closedAt: dto.closedAt,
})

// un gasto sirve si tiene concepto y algún monto
export const isExpenseFilled = (expense: CashExpense): boolean => expense.concept.trim() !== '' && expense.cashAmount + expense.transferAmount > 0

// deja solo los gastos completos, con el concepto y el recibo sin espacios sobrantes
export const cleanExpenses = (expenses: CashExpense[]): CashExpense[] =>
  expenses.filter(isExpenseFilled).map((expense) => ({ ...expense, concept: expense.concept.trim(), receiptNumber: expense.receiptNumber.trim() }))

export const toneOf = (difference: number): CashBalanceTone => (difference === 0 ? 'balanced' : difference < 0 ? 'short' : 'over')

// efectivo esperado = lo que ya trae el turno (fondo + ventas y abonos en efectivo) - gastos en efectivo; diferencia = contado - esperado
// transferencias y abonos se comparan con lo declarado: declarado - recibido
export const computeClosing = (
  session: Pick<CashSession, 'expectedCash' | 'transferTotal' | 'abonosTotal'>,
  expenses: CashExpense[],
  declared: { cash: number; transfer: number; abonos: number }
): CashClosing => {
  const filled = expenses.filter(isExpenseFilled)
  const expensesCash = filled.reduce((sum, expense) => sum + expense.cashAmount, 0)
  const expensesTransfer = filled.reduce((sum, expense) => sum + expense.transferAmount, 0)
  const expectedCash = session.expectedCash - expensesCash
  const difference = declared.cash - expectedCash
  return {
    expensesCash,
    expensesTransfer,
    expectedCash,
    difference,
    tone: toneOf(difference),
    transferDifference: declared.transfer - session.transferTotal,
    abonosDifference: declared.abonos - session.abonosTotal,
  }
}

export const BALANCE_LABEL: Record<CashBalanceTone, string> = { balanced: 'Caja cuadrada', short: 'Faltante en caja', over: 'Sobrante en caja' }

// del renglón del pedido al de la verificación: completa lo que no viene (cantidad 1, precio 0, nombre «Repuesto»)
export const toInvoiceLine = (item: SaleItemDto): InvoiceLineItem => {
  const quantity = item.quantity || 1
  const unitPrice = item.unitPrice || item.price || 0
  return {
    id: item.id || item.productId,
    productId: item.productId,
    productCode: item.productCode || item.code,
    productName: item.productName || item.title || 'Repuesto',
    quantity,
    unitPrice,
    lineTotal: item.lineTotal || quantity * unitPrice,
  }
}
