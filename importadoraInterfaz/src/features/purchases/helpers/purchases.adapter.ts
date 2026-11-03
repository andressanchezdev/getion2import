// purchases.adapter · convierte lo que responde la API en Go (órdenes de compra y sus renglones) a lo que usa la app, y filtra la tabla por texto y estado
// conecta con: purchases.service (convierte cada respuesta) y usePurchases (filtra); es el único lugar que conoce los nombres del backend en compras
// ojo: lo que la API no trae queda neutro: sin fecha esperada, sin notas y sin código del proveedor
import type { Purchase, PurchaseDto, PurchaseItem, PurchaseItemDto, PurchaseStatus } from '../types/purchases.types'

const STATUSES: PurchaseStatus[] = ['draft', 'ordered', 'partial', 'received', 'voided']
const text = (value: string | null | undefined): string => (value ?? '').trim()
const money = (value: number | null | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const dayOf = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '')

export const toPurchaseItem = (dto: PurchaseItemDto): PurchaseItem => ({
  id: dto.id,
  productId: dto.productId,
  productCode: text(dto.productCode),
  productName: text(dto.productName),
  supplierCode: text(dto.supplierCode),
  quantity: money(dto.quantity),
  receivedQty: money(dto.receivedQty),
  unitCost: money(dto.unitCost),
  ivaPercent: money(dto.ivaPercent),
  subtotal: money(dto.subtotal),
})

export const toPurchase = (dto: PurchaseDto): Purchase => ({
  id: dto.id,
  serial: text(dto.serialCode) || `Compra ${dto.id}`,
  supplierId: dto.supplierId,
  supplierName: text(dto.supplierName) || 'Sin proveedor',
  warehouseId: dto.warehouseId,
  warehouseName: text(dto.warehouseName),
  employeeName: text(dto.employeeName) || '—',
  status: STATUSES.includes(dto.status as PurchaseStatus) ? (dto.status as PurchaseStatus) : 'draft',
  supplierRef: text(dto.supplierRef),
  expectedDate: dayOf(dto.expectedDate),
  subtotal: money(dto.subtotal),
  ivaTotal: money(dto.ivaTotal),
  total: money(dto.total),
  notes: text(dto.notes),
  receivedAt: dayOf(dto.receivedAt),
  createdAt: dayOf(dto.createdAt),
  items: (dto.items ?? []).map(toPurchaseItem),
})

const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// busca por serie, proveedor o referencia del proveedor (sin tildes ni mayúsculas) y filtra por estado
export const filterPurchases = (items: Purchase[], query: string, status: PurchaseStatus | 'all'): Purchase[] => {
  const needle = plain(query.trim())
  return items.filter((purchase) => {
    if (status !== 'all' && purchase.status !== status) return false
    if (!needle) return true
    return plain(`${purchase.serial} ${purchase.supplierName} ${purchase.supplierRef}`).includes(needle)
  })
}
