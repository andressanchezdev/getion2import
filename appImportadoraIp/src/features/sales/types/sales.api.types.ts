// sales.api.types · lo que responde el backend en ventas (nombres tal cual del Swagger) para el historial y los pedidos pendientes
// conecta con: sales.adapter (los convierte a los tipos de la app) y sales.service (los pide)
// ojo: POST /sales/pendings NO devuelve ventas sino carritos guardados (uuid, count, quantities); POST /sales/history responde 500 en el backend de pruebas, así que su forma sale solo del Swagger

export interface SaleUserDto {
  userId?: number
  name?: string
  email?: string
  photo?: string
}

export interface SaleSellerDto {
  userId?: number
  name?: string
}

// models.HistorySaleResponse
export interface HistorySaleDto {
  saleId: number
  serialCode?: number
  userId?: number
  sellerId?: number
  warehouseId?: number
  invoiceStatus?: string
  totalAmount?: number
  created_at?: string
  userInformation?: SaleUserDto | null
  sellerInformation?: SaleSellerDto | null
  paymentInformation?: { amount?: number; paymentId?: number } | null
  invoiceInformation?: { prefix?: string; number?: number; creditDays?: number } | null
}

// models.PendingResponse: un carrito guardado que se puede retomar
export interface PendingCartDto {
  uuid: string
  userId?: number
  sellerId?: number
  warehouseId?: number
  count?: number // líneas
  quantities?: number // unidades
  totalAmount?: number
  created_at?: string
  userInformation?: SaleUserDto | null
  sellerInformation?: SaleSellerDto | null
}
