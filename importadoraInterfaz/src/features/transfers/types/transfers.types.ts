// transfers.types · contratos y modelos para traslados y reubicación multibodega
// conecta con: transfers.service, TransfersScreen, CreateTransferModal y Swagger

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
  productId: number
  code?: string
  description: string
  quantity: number
}

export type TransferStatus =
  | 'pendiente'
  | 'picking_verified'
  | 'packing_verified'
  | 'approved'
  | 'rejected'

export interface TrasladeItem {
  saleId: number
  serialCode: number
  invoiceStatus: TransferStatus | string
  originWarehouse: { id: number; name: string }
  destWarehouse: { id: number; name: string }
  products: TransferProductItem[]
  operatorName?: string
  createdAt?: string
  reason?: string
}

export interface CreateTransferInput {
  productId: number
  productName: string
  productCode: string
  originWarehouseId: number
  destWarehouseId: number
  quantity: number
}
