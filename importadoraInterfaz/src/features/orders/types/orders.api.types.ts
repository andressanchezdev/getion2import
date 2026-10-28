// orders.api.types · lo que responde el backend en pedidos: conteos por etapa (POST /management), lista (POST /management/saleOrders) y detalle (POST /management/saleId)
// conecta con: orders.adapter (los convierte a los tipos de la app) y orders.service (los pide)
// ojo: nombres tal cual del backend, verificados con datos reales en la versión anterior (feature management); los campos de itemInformation y payments no están documentados al detalle, por eso son opcionales
export interface OrderCountsDto {
  Verification?: number
  Picking?: number
  Packing?: number
  Invoicing?: number
  Dispatch?: number
  Sent?: number
}

export interface OrderPersonDto {
  userId?: number
  name?: string
  lastName?: string
  identification?: string
  email?: string
  priceType?: string
}

// una fila de POST /management/saleOrders
export interface OrderListItemDto {
  saleId: number
  serialCode?: number
  paymentMethod?: string
  totalAmount?: number
  createdAt?: string
  isPause?: number
  verifiedTransaction?: number
  verifiedLocation?: number
  customerInformation?: OrderPersonDto | null
  sellerInformation?: OrderPersonDto | null
}

export interface OrderItemInfoDto {
  code?: string
  description?: string
  brandName?: string
  categoryName?: string
  modelName?: string
}

export interface OrderItemDto {
  itemId?: number
  productId: number
  quantity: number
  price?: number
  discount?: number
  reservedQuantity?: number
  itemInformation?: OrderItemInfoDto | null
}

export interface OrderPaymentDto {
  paymentId?: number
  amount?: number
  paymentMethod?: string
  status?: string
  created_at?: string
}

// POST /management/saleId: la venta con su cliente, vendedor y líneas; los pagos van aparte
export interface OrderDetailDto {
  sale: {
    saleId: number
    serialCode?: number
    invoiceStatus?: string
    paymentMethod?: string
    totalAmount?: number
    status?: string
    saleType?: string
    saleChannel?: string
    isPause?: number
    isCancelled?: number
    createdAt?: string
    updateAt?: string
    verifiedTransaction?: number
    verifiedLocation?: number
    shippingCost?: number
    customerInformation?: OrderPersonDto | null
    sellerInformation?: OrderPersonDto | null
    saleItems?: OrderItemDto[] | null
  }
  payments?: OrderPaymentDto[] | null
}
