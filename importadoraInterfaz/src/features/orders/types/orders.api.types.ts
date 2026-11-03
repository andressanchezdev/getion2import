// orders.api.types · lo que responde la API en Go en pedidos: la lista (GET /sales), el detalle (GET /sales/:id) y los pagos de un pedido (GET /payments?saleId=)
// conecta con: orders.adapter (los convierte a los tipos de la app) y orders.service (los pide)
// ojo: nombres tal cual del backend (SaleResponse, SaleItemResponse y PaymentResponse); la lista no trae los renglones, el detalle sí
// ojo: un pedido y una venta son lo mismo en la API: es un pedido mientras no ha llegado a despacho y está abierto; la etapa actual es currentStage

// las etapas que tiene un pedido en la API (verification → picking → packing → invoicing → dispatch → sent); cancelled si se anuló
export type SaleStageDto = 'verification' | 'picking' | 'packing' | 'invoicing' | 'dispatch' | 'sent' | 'cancelled' | string

export interface SaleItemDto {
  id: number
  productId: number
  stockId: number
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
}

export interface SaleDto {
  id: number
  serialCode: string // ej. PD-1234
  customerId?: number | null
  customerName?: string | null
  employeeId?: number
  employeeName?: string
  warehouseId?: number
  warehouseName?: string
  priceTier?: string
  paymentMethod?: string
  immediatePicking?: boolean
  status?: string // 'open' | 'completed' | 'cancelled'
  currentStage?: SaleStageDto
  subtotal?: number
  discountTotal?: number
  ivaTotal?: number
  total?: number
  paidTotal?: number
  creditAmount?: number
  saleAt?: string | null
  cancelReason?: string | null
  paymentProofUrl?: string | null
  paymentReference?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  items?: SaleItemDto[] | null
}

export interface SalePaymentDto {
  id: number
  method: string
  amount: number
  status: string
  proofUrl?: string | null
  reference?: string | null
  createdAt?: string
}

// una fila de GET /sales/:id/history
export interface StageHistoryDto {
  stage: string
  employeeName?: string | null
  enteredAt: string
  leftAt?: string | null
  minutes?: number
}
