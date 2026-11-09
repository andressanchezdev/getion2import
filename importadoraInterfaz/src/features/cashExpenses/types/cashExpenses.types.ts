// cashExpenses.types · contratos de «Facturas»: los gastos que pagan las cajas de todas las bodegas (pagos de recepciones de compra y gastos menores) una vez la caja cierra
// conecta con: cashExpenses.service (convierte), cashExpenses.adapter, useCashExpenses y la tabla

// lo que responde GET /cash/expenses
export interface CashExpenseDto {
  id: number
  sessionId: number
  warehouseId: number
  warehouseName: string
  expenseType: string
  receiptNumber?: string
  concept: string
  cashAmount: number
  total: number
  purchaseId?: number
  purchaseCode?: string
  supplierName?: string
  paidBy: string
  closedAt: string
}

// lo que usa la app
export interface CashExpenseRecord {
  id: number
  warehouseId: number
  warehouseName: string
  typeLabel: string
  isPurchase: boolean // pago de una recepción de compra (ligado a una orden y a un proveedor)
  receiptNumber: string
  concept: string
  purchaseCode: string
  supplierName: string
  paidBy: string
  closedAt: string
  total: number
}

export interface CashExpenseFilters {
  query: string
  warehouseId: string // 'all' o el id de la bodega
  from: string // AAAA-MM-DD o vacío
  to: string
}
