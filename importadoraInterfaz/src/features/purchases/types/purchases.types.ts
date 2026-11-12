// purchases.types · contratos de compras: la orden y sus renglones (lo que usa la app y lo que responde el backend), lo que se envía y el estado del slice
// conecta con: purchases.adapter, purchases.rules, purchases.service, purchases.slice, los hooks y los componentes de compras
import type { LoadStatus } from '@/api'

export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'voided'

// ---- lo que usa la app ----
export interface PurchaseItem {
  id: number
  productId: number
  productCode: string
  productName: string
  supplierCode: string
  quantity: number // lo pedido
  receivedQty: number // lo que ya entró a la bodega
  unitCost: number
  ivaPercent: number
  subtotal: number
}

export interface Purchase {
  id: number
  serial: string
  supplierId: number
  supplierName: string
  warehouseId: number
  warehouseName: string
  employeeName: string
  status: PurchaseStatus
  supplierRef: string
  expectedDate: string // AAAA-MM-DD o ''
  subtotal: number
  ivaTotal: number
  total: number
  paidTotal: number // lo que la caja ya pagó de la recepción
  notes: string
  receivedAt: string // '' si no se ha recibido del todo
  createdAt: string
  items: PurchaseItem[] // vacío en la lista; el detalle los trae
}

// ---- lo que responde la API en Go ----
export interface PurchaseItemDto {
  id: number
  productId: number
  productCode: string
  productName: string
  supplierCode?: string | null
  quantity: number
  receivedQty: number
  unitCost: number
  ivaPercent?: number | null
  subtotal: number
}

export interface PurchaseDto {
  id: number
  serialCode: string
  supplierId: number
  supplierName?: string
  warehouseId: number
  warehouseName?: string
  employeeName?: string
  status: string
  supplierRef?: string | null
  expectedDate?: string | null
  subtotal?: number
  ivaTotal?: number
  total?: number
  paidTotal?: number
  notes?: string | null
  receivedAt?: string | null
  createdAt?: string
  items?: PurchaseItemDto[] | null
}

// un producto del catálogo de un proveedor (lo que él nos vende y a qué costo)
export interface SupplierProduct {
  productId: number
  code: string
  name: string
  supplierCode: string // el código con que el proveedor conoce el producto
  cost: number
}

export interface SupplierProductDto {
  productId: number
  productCode: string
  productName: string
  supplierCode?: string | null
  cost: number
}

// ---- lo que se envía ----
export interface CreatePurchaseInput {
  supplierId: number
  warehouseId: number
  supplierRef?: string
  expectedDate?: string
  notes?: string
  items: Array<{ productId: number; quantity: number; unitCost: number; ivaPercent?: number }>
}

// pago de una recepción desde la caja: solo efectivo
export interface PayPurchaseInput {
  cashAmount: number
  receiptNumber?: string
}

export interface ReceiveLineInput {
  purchaseItemId: number
  quantity: number
  location: string
}

// un proveedor para elegir al crear la orden
export interface SupplierOption {
  id: number
  name: string
}

// ---- estado del slice (no se guarda en el navegador) ----
export interface PurchasesState {
  items: Purchase[]
  warehouseId: number | null // de qué bodega es la lista cargada
  status: LoadStatus
  error: string | null
  requestId: string | null
  saving: boolean // se está creando, recibiendo o anulando
  detail: { id: number | null; data: Purchase | null; status: LoadStatus; error: string | null; requestId: string | null }
  suppliers: SupplierOption[]
  catalogTicks: Record<number, number> // por proveedor: sube cuando llega por tiempo real una importación de su catálogo
}
