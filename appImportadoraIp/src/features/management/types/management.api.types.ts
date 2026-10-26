// management.api.types · lo que responde POST /management (nombres tal cual de la respuesta real, incluidos los errores de escritura del backend)
// conecta con: management.adapter (lo convierte a las etapas y canales de la app) y management.service (lo pide)
// ojo: las cinco etapas (Verification, Picking, Packing, Invoicing, Dispatch) y Sent NO dependen de "state"; lo que cambia con "state" son los contadores orders* (desglose por canal de esa etapa).
// "ordersDirectDisptach" está escrito así en el backend

export interface ManagementCountsDto {
  Verification?: number
  Picking?: number
  Packing?: number
  Invoicing?: number
  Dispatch?: number
  Sent?: number
  withoutTaking?: number
  ordersMajority?: number
  ordersImmediate?: number
  ordersCorporate?: number
  ordersMinority?: number
  ordersDirect?: number
  ordersDirectDisptach?: number
  ordersTrasladeWithoutTaking?: number
  ordersFinalAssignment?: number
  ordersFinalFinished?: number
}

// POST /management/saleOrders (models.ManagementSaleOrdersResponse; solo lo que usa la app)
export interface ManagementOrderDto {
  saleId: number
  serialCode?: number
  paymentMethod?: string
  totalAmount?: number
  createdAt?: string
  isPause?: number
  verifiedTransaction?: number
  verifiedLocation?: number
  customerInformation?: { name?: string; lastName?: string } | null
  sellerInformation?: { name?: string; lastName?: string } | null
}

