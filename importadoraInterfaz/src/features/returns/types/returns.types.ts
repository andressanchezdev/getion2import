// returns.types · contratos de devoluciones y garantías: lo que manda el backend, lo que se envía y el estado de la vista (clave 'returns')
// conecta con: returns.service (HTTP), returns.slice (estado), returns.helpers (filtros y conteos) y los componentes de la pantalla
export type ReturnResolutionType = 'exchange' | 'credit_balance'
export type ReturnReasonType = 'warranty' | 'wrong_item'
export type ReturnStatus = 'pending' | 'approved' | 'rejected'
export type ReturnStatusFilter = 'all' | ReturnStatus

export interface ReturnItemDto {
  id?: number
  saleItemId: number
  productCode?: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  restock?: boolean
}

export interface ReturnDto {
  id: number
  companyId?: number
  saleId: number
  saleSerial?: string
  warehouseId?: number
  warehouseName?: string
  customerId: number
  customerName?: string
  employeeId?: number
  employeeName?: string
  approvedByEmployeeId?: number
  approvedByName?: string
  reason: string
  reasonType?: ReturnReasonType
  resolutionType: ReturnResolutionType
  replacementProductId?: number
  replacementProductCode?: string
  replacementProductName?: string
  evidenceUrl?: string
  receiptUrl?: string
  status: ReturnStatus
  total: number
  createdAt: string
  items?: ReturnItemDto[]
}

export interface CreateReturnItemInput {
  saleItemId: number
  quantity: number
  restock?: boolean
}

export interface CreateReturnInput {
  saleId: number
  reason: string
  reasonType?: ReturnReasonType
  resolutionType: ReturnResolutionType
  replacementStockId?: number
  evidenceUrl?: string
  receiptUrl?: string
  items: CreateReturnItemInput[]
}

// renglón de una venta que se puede devolver
export interface SaleOptionItem {
  id: number
  productId: number
  productName: string
  productCode?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

// venta que se busca para asociarle la devolución
export interface SaleOption {
  id: number
  serial: string
  customerName: string
  total: number
  createdAt: string
  items?: SaleOptionItem[]
}

export interface ReturnsState {
  items: ReturnDto[]
  loading: boolean
  error: string | null
  warehouseId: number | null // null = todas las bodegas
  status: ReturnStatusFilter
  query: string
}
