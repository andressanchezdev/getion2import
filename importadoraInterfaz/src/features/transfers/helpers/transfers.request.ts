// transfers.request · reglas del pedido de traslado con varias bodegas de origen: agregar, cambiar y quitar líneas, agrupar por origen y validar
// conecta con: useTransferRequest (las usa), createTransferRequestThunk (agrupa y valida) y transfers.types (TransferRequestLine)
// ojo: la API crea un traslado por cada bodega de origen; por eso el pedido se agrupa por origen y cada grupo es un traslado
import type { TransferRequestLine } from '../types/transfers.types'

// dos líneas son la misma si son del mismo producto y salen de la misma bodega
const sameLine = (a: TransferRequestLine, b: Pick<TransferRequestLine, 'productId' | 'originWarehouseId'>) =>
  a.productId === b.productId && a.originWarehouseId === b.originWarehouseId

// deja la cantidad entre 1 y lo disponible en la bodega de origen
export const clampQuantity = (quantity: number, max: number): number => Math.min(Math.max(1, Math.floor(quantity) || 1), Math.max(1, max))

// agrega una línea; si ya existe (mismo producto y misma bodega) suma la cantidad sin pasarse de lo disponible
export const addLine = (lines: TransferRequestLine[], line: TransferRequestLine): TransferRequestLine[] => {
  const existing = lines.find((item) => sameLine(item, line))
  if (!existing) return [...lines, { ...line, quantity: clampQuantity(line.quantity, line.max) }]
  return lines.map((item) => (item === existing ? { ...item, quantity: clampQuantity(item.quantity + line.quantity, item.max) } : item))
}

// cambia la cantidad de una línea (sin pasarse de lo disponible)
export const setLineQuantity = (lines: TransferRequestLine[], target: Pick<TransferRequestLine, 'productId' | 'originWarehouseId'>, quantity: number): TransferRequestLine[] =>
  lines.map((item) => (sameLine(item, target) ? { ...item, quantity: clampQuantity(quantity, item.max) } : item))

// quita una línea
export const removeLine = (lines: TransferRequestLine[], target: Pick<TransferRequestLine, 'productId' | 'originWarehouseId'>): TransferRequestLine[] =>
  lines.filter((item) => !sameLine(item, target))

export interface OriginGroup {
  originWarehouseId: number
  originWarehouseName: string
  lines: TransferRequestLine[]
}

// agrupa las líneas por bodega de origen, en el orden en que se agregaron
export const groupByOrigin = (lines: TransferRequestLine[]): OriginGroup[] => {
  const groups = new Map<number, OriginGroup>()
  for (const line of lines) {
    const group = groups.get(line.originWarehouseId) ?? { originWarehouseId: line.originWarehouseId, originWarehouseName: line.originWarehouseName, lines: [] }
    group.lines.push(line)
    groups.set(line.originWarehouseId, group)
  }
  return [...groups.values()]
}

// total de unidades del pedido
export const totalUnits = (lines: TransferRequestLine[]): number => lines.reduce((sum, line) => sum + line.quantity, 0)

// revisa el pedido antes de enviarlo; devuelve el texto del primer problema, o null si está bien
export const validateRequest = (lines: TransferRequestLine[], destWarehouseId: number): string | null => {
  if (!destWarehouseId) return 'Elige la bodega que recibe el pedido.'
  if (lines.length === 0) return 'Agrega al menos un repuesto al pedido.'
  if (lines.some((line) => line.originWarehouseId === destWarehouseId)) return 'Una bodega no puede pedirse a sí misma: quita las líneas que salen de la bodega que recibe.'
  const over = lines.find((line) => line.quantity < 1 || line.quantity > line.max)
  if (over) return `La cantidad de ${over.code} debe estar entre 1 y ${over.max} (lo disponible en ${over.originWarehouseName}).`
  return null
}
