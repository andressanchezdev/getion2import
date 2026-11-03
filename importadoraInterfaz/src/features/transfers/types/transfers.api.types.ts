// transfers.api.types · lo que responde la API en Go en traslados y stock
export type TransferApiStatus = 'pending' | 'in_transit' | 'received' | 'with_novelty' | 'cancelled'

export interface TransferItemDto {
  id: number
  productId: number
  productCode?: string
  productName?: string
  originStockId?: number
  destinationLocation?: string | null
  quantity: number
  receivedQty?: number
}

export interface TransferDto {
  id: number
  serialCode?: string
  transferType?: string
  originWarehouseId: number
  originWarehouseName?: string
  destinationWarehouseId: number
  destinationWarehouseName?: string
  employeeId?: number
  employeeName?: string
  dispatchedByEmployeeId?: number
  dispatchedByEmployeeName?: string
  receivedByEmployeeId?: number
  receivedByEmployeeName?: string
  status: TransferApiStatus | string
  priority?: string
  notes?: string | null
  noveltyNotes?: string | null
  cancelReason?: string | null
  dispatchedAt?: string
  receivedAt?: string
  createdAt?: string
  items?: TransferItemDto[] | null
}

export interface TransferStockRowDto {
  stockId: number
  warehouseId: number
  productId: number
  available: number
  reserved: number
  sellable: number
}

export interface TransferProductDto {
  id: number
  code?: string
  name?: string
  description?: string | null
  brandName?: string | null
}

export interface CreateTransferBody {
  originWarehouseId: number
  destinationWarehouseId: number
  transferType?: string
  notes?: string
  items: Array<{ productId: number; originStockId: number; quantity: number; destinationLocation?: string }>
}

export interface ReceiveTransferBody {
  items: Array<{ itemId: number; receivedQty: number; destinationLocation?: string }>
  noveltyNotes?: string
  hasNovelty?: boolean
}
