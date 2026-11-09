// purchases.rules · reglas puras de compras: qué falta recibir, cuándo se puede recibir o anular, validar lo que se recibe y calcular los totales de una orden nueva
// conecta con: usePurchaseReceive, usePurchaseForm, PurchasesTable y PurchaseDetailPanel; no toca el store
// ojo: la API es la que manda (valida otra vez); estas reglas evitan enviar lo que seguro se rechaza
import type { Purchase, PurchaseItem, ReceiveLineInput } from '../types/purchases.types'

// lo que falta por recibir de un renglón
export const pendingOf = (item: Pick<PurchaseItem, 'quantity' | 'receivedQty'>): number => Math.max(item.quantity - item.receivedQty, 0)

// se recibe mercancía mientras la orden esté pedida o recibida en parte
export const canReceive = (purchase: Pick<Purchase, 'status'>): boolean => purchase.status === 'ordered' || purchase.status === 'partial'

// solo se anula una orden pedida a la que no ha entrado nada
export const canVoid = (purchase: Pick<Purchase, 'status' | 'items'>): boolean => purchase.status === 'ordered' && purchase.items.every((item) => item.receivedQty === 0)

// por qué lo que se va a recibir no se puede enviar (null si está bien)
export const receiveProblem = (items: PurchaseItem[], lines: ReceiveLineInput[]): string | null => {
  const filled = lines.filter((line) => line.quantity > 0)
  if (filled.length === 0) return 'Pon la cantidad que recibes de al menos un producto'
  for (const line of filled) {
    const item = items.find((candidate) => candidate.id === line.purchaseItemId)
    if (!item) return 'Hay un producto que no es de esta orden'
    if (line.quantity > pendingOf(item)) return `${item.productName}: recibes más de lo pendiente (${pendingOf(item)})`
    if (line.location.trim() === '') return `${item.productName}: elige la ubicación donde queda`
  }
  return null
}

// cuánto vale un renglón nuevo con su IVA
export interface DraftLine {
  productId: number
  productCode: string
  productName: string
  quantity: number
  unitCost: number
  ivaPercent: number
}

export const draftTotals = (lines: DraftLine[]): { subtotal: number; iva: number; total: number } => {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
  const iva = lines.reduce((sum, line) => sum + line.quantity * line.unitCost * (line.ivaPercent / 100), 0)
  return { subtotal, iva, total: subtotal + iva }
}

// por qué la orden nueva no se puede enviar (null si está bien)
export const draftProblem = (supplierId: number, lines: DraftLine[]): string | null => {
  if (supplierId <= 0) return 'Elige el proveedor'
  if (lines.length === 0) return 'Agrega al menos un producto'
  const broken = lines.find((line) => line.quantity < 1 || line.unitCost <= 0)
  if (broken) return `${broken.productName}: pon la cantidad y el costo`
  return null
}

// lo que falta por pagar de una orden
export const pendingToPay = (purchase: Pick<Purchase, 'total' | 'paidTotal'>): number => Math.max(0, purchase.total - purchase.paidTotal)

// la caja solo paga una recepción completa y mientras quede algo pendiente
export const canPay = (purchase: Pick<Purchase, 'status' | 'total' | 'paidTotal'>): boolean => purchase.status === 'received' && pendingToPay(purchase) > 0

// qué le falta al pago para poder enviarse (null = listo)
export const payProblem = (amount: number, pending: number): string | null => {
  if (!(amount > 0)) return 'Escribe cuánto vas a pagar.'
  if (amount > pending) return 'El pago no puede superar lo pendiente de la orden.'
  return null
}
