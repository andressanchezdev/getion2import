// transfers.types · modelos que usa la app en traslados y reubicación multibodega
// conecta con: transfers.adapter (los arma desde la API), transfers.service, transfers.slice (estado), TransfersScreen, CreateTransferForm y ReceiveTransferForm
import type { StockFullDto } from '@/features/inventory'

export interface WarehouseStockLocation {
  warehouseId: number
  warehouseName: string
  stock: number
  reservedStock: number
  availableStock: number
}

export interface ProductStockMatrix {
  productId: number
  code: string
  description: string
  brandName?: string
  locations: WarehouseStockLocation[]
  totalStock: number
  totalAvailable: number
}

export interface TransferProductItem {
  itemId: number
  productId: number
  code?: string
  description: string
  quantity: number
  receivedQty?: number
  destinationLocation: string
}

// pending (creado) -> in_transit (despachado) -> received | with_novelty | cancelled
export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'with_novelty' | 'cancelled'
export type TransferType = 'inter_warehouse' | 'relocation' | 'central_dispatch' | string
export type TransferPriority = 'normal' | 'high'

export interface TrasladeItem {
  id: number
  serialCode: string
  type: TransferType
  typeLabel: string
  status: TransferStatus
  priority: TransferPriority
  originWarehouse: { id: number; name: string }
  destWarehouse: { id: number; name: string }
  products: TransferProductItem[]
  employeeId?: number
  employeeName?: string // Quién lo pidió
  dispatchedByEmployeeId?: number
  dispatchedByEmployeeName?: string // Quién lo sacó
  receivedByEmployeeId?: number
  receivedByEmployeeName?: string // Quién lo recibió
  createdAt?: string
  dispatchedAt?: string
  receivedAt?: string
  updatedAt?: string
  notes?: string
  noveltyNotes?: string
  cancelReason?: string
}

// un traslado con varios productos que salen de UNA misma bodega
export interface CreateTransferBatchInput {
  originWarehouseId: number
  destWarehouseId: number
  items: Array<{ productId: number; quantity: number }>
  type?: TransferType
  notes?: string
  isPriority?: boolean
}

export interface TransferRequestOriginOption {
  warehouseId: number
  warehouseName: string
  stock: number
}

// una línea del pedido de traslado: un producto, de qué bodega sale y cuántas unidades (max = lo disponible allá)
export interface TransferRequestLine {
  productId: number
  code: string
  description: string
  originWarehouseId: number
  originWarehouseName: string
  quantity: number
  max: number
  availableOrigins?: TransferRequestOriginOption[]
  unavailable?: boolean
}

// lo que pasó con cada bodega de origen al enviar el pedido: el traslado creado o por qué falló
export interface TransferRequestResult {
  originWarehouseId: number
  originWarehouseName: string
  transfer?: TrasladeItem
  error?: string
}

export type TransfersLoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

// una lista que se pide al backend; requestId descarta respuestas de pedidos anteriores
interface RemoteList<T> {
  items: T[]
  status: TransfersLoadStatus
  error: string | null
  requestId: string | null
}

export interface TransferDraft {
  destWarehouseId: number
  lines: TransferRequestLine[]
}

export interface TransfersState {
  list: RemoteList<TrasladeItem> // traslados de la bodega activa
  stock: RemoteList<StockFullDto> // existencias de la bodega activa (pestaña «Repuestos en sede»)
  search: RemoteList<ProductStockMatrix> // resultados del buscador del formulario de nuevo traslado
  draft: TransferDraft
}

// filtros de la tabla de traslados
export interface TransferFilters {
  query: string
  type: string
  direction: 'all' | 'incoming' | 'outgoing'
  status: string
}
