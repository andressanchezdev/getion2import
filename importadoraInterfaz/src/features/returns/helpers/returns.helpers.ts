// returns.helpers · funciones puras de devoluciones: filtro de la tabla, conteos para los KPIs y armado del pedido de creación
// conecta con: returns.selectors (filtra y cuenta) y useCreateReturnForm (arma los renglones a devolver); con pruebas en returns.helpers.test.ts
import type { CreateReturnItemInput, ReturnDto, ReturnStatusFilter, SaleOption } from '../types/returns.types'

export interface ItemPick {
  selected: boolean
  quantity: number
}

// aplica estado y búsqueda (factura, cliente, motivo, bodega o número de caso) sobre lo ya cargado
export const filterReturns = (items: ReturnDto[], status: ReturnStatusFilter, query: string): ReturnDto[] => {
  const q = query.trim().toLowerCase()
  return items.filter((r) => {
    if (status !== 'all' && r.status !== status) return false
    if (!q) return true
    return [r.saleSerial, r.customerName, r.reason, r.warehouseName].some((v) => (v ?? '').toLowerCase().includes(q)) || String(r.id).includes(q)
  })
}

export interface ReturnsCounts {
  total: number
  pending: number
  approved: number
  rejected: number
  exchange: number
  creditBalance: number
}

export const countReturns = (items: ReturnDto[]): ReturnsCounts => ({
  total: items.length,
  pending: items.filter((r) => r.status === 'pending').length,
  approved: items.filter((r) => r.status === 'approved').length,
  rejected: items.filter((r) => r.status === 'rejected').length,
  exchange: items.filter((r) => r.resolutionType === 'exchange').length,
  creditBalance: items.filter((r) => r.resolutionType === 'credit_balance').length,
})

// al elegir una venta todos sus renglones quedan marcados con su cantidad completa
export const initialPicks = (sale: SaleOption): Record<number, ItemPick> =>
  Object.fromEntries((sale.items ?? []).map((it) => [it.id, { selected: true, quantity: it.quantity || 1 }]))

// deja la cantidad entre 1 y lo vendido
export const clampQuantity = (quantity: number, max: number): number => Math.max(1, Math.min(max, quantity))

// solo los renglones marcados, siempre devolviendo al stock
export const picksToItems = (picks: Record<number, ItemPick>): CreateReturnItemInput[] =>
  Object.entries(picks)
    .filter(([, pick]) => pick.selected)
    .map(([saleItemId, pick]) => ({ saleItemId: Number(saleItemId), quantity: pick.quantity, restock: true }))
