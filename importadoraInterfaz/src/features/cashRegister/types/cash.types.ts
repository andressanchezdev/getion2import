// cash.types · contratos de la caja: el turno (lo que usa la app y lo que responde el backend), los gastos del cierre y el estado del slice
// conecta con: cash.service, cash.helpers, cash.slice, cash.selectors, los hooks y los componentes de caja
import type { LoadStatus } from '@/api'

// lo que usa la app; los números del turno abierto son en vivo y los de uno cerrado quedaron guardados
export interface CashSession {
  id: number
  warehouseId: number
  warehouseName: string
  status: 'open' | 'closed'
  openedByName: string
  openedAt: string
  openingAmount: number // fondo inicial de cambio
  cashTotal: number // ventas en efectivo verificadas
  transferTotal: number // ventas por transferencia recibidas
  abonosTotal: number // pagos de ventas a crédito recibidos en el turno
  paymentsCount: number
  expensesCash: number // gastos pagados en efectivo (solo cuando ya cerró)
  expectedCash: number // fondo + ventas en efectivo + abonos en efectivo (el cierre le resta los gastos)
  countedCash?: number
  difference?: number // contado - esperado
  closedByName?: string
  closedAt?: string
}

// un gasto menor pagado desde la caja; se declara al cerrar el turno
export interface CashExpense {
  receiptNumber: string
  concept: string
  cashAmount: number
  transferAmount: number
}

// lo que responde la API en Go (CashSessionResponse)
export interface CashSessionDto {
  id: number
  warehouseId: number
  warehouseName?: string
  status: 'open' | 'closed'
  openedByName: string
  openedAt: string
  openingAmount: number
  closedByName?: string
  closedAt?: string
  cashTotal?: number
  transferTotal?: number
  abonosTotal?: number
  paymentsCount?: number
  expensesCash?: number
  expectedCash?: number
  countedCash?: number
  difference?: number
}

export interface CloseCashInput {
  warehouseId: number
  countedCash: number
  countedTransfer?: number // transferencias que declara el cajero
  countedAbonos?: number // abonos que declara el cajero (solo si hubo)
  notes?: string
  expenses: CashExpense[]
}

export interface CashState {
  warehouseId: number | null // de qué bodega es el turno cargado
  session: CashSession | null // null = esa bodega no tiene turno abierto
  status: LoadStatus
  error: string | null
  saving: boolean // se está abriendo o cerrando el turno
  requestId: string | null // la última carga lanzada: una respuesta anterior se descarta
  closedTick: number // sube cada vez que llega por tiempo real el cierre de un turno: la lista de Facturas (gastos de cajas cerradas) se vuelve a pedir
}

// el resultado del cierre: lo que debería haber en la gaveta contra lo contado
export type CashBalanceTone = 'balanced' | 'short' | 'over'

export interface CashClosing {
  expensesCash: number
  expensesTransfer: number
  expectedCash: number
  difference: number
  tone: CashBalanceTone
  transferDifference: number // transferencias declaradas - recibidas
  abonosDifference: number // abonos declarados - recibidos
}

// ---- cobro mixto de un pedido en Caja ----
export type CollectLineMethod = 'cash' | 'transfer' | 'credit'

// una línea del formulario de cobro: método, monto y, si es transferencia, referencia, banco y foto del comprobante
export interface CollectLine {
  method: CollectLineMethod
  amount: number
  reference: string
  bank: string
  proofUrl: string // la foto del comprobante ya optimizada (data URL)
  fileName: string
}

// lo que se envía a POST /payments/batch
export interface CollectPaymentInput {
  saleId: number
  payments: Array<{ method: CollectLineMethod; amount: number; reference?: string; proofUrl?: string; bank?: string }>
}

// cómo quedó el pedido después del cobro
export interface CollectResult {
  stage: string // verification_ok = pago confirmado
  paidTotal: number
  creditAmount: number
  balance: number
}

// un renglón del pedido como lo responde GET /sales/:id (los nombres cambian según la versión del backend)
export interface SaleItemDto {
  id?: number
  productId: number
  productCode?: string
  code?: string
  productName?: string
  title?: string
  quantity?: number
  unitPrice?: number
  price?: number
  lineTotal?: number
}

// renglón de la factura que el cajero coteja contra la salida física
export interface InvoiceLineItem {
  id: number
  productId: number
  productCode?: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}
