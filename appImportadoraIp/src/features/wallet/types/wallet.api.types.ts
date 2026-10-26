// wallet.api.types · lo que responde el backend en cartera (nombres tal cual del Swagger) y los datos que se envían al pagar o cambiar el cupo
// conecta con: wallet.adapter (convierte a los tipos de la app), wallet.service y wallet.payments.service (los piden y envían)
// ojo: la API real NO manda creditAmount, creditDays, reservedCredit ni verifiedPayments en POST /wallet: el cupo viene en creditInformation (quota, subtract, days); la app solo usa los tipos de wallet.types; estos nombres (userId, creditAmount, saleId...) no salen de wallet.adapter y los services

// POST /wallet (models.WalletUser): un cliente con su crédito
export interface WalletUserDto {
  userId: number
  name?: string
  lastName?: string
  identification?: string
  photo?: string
  isCredit?: boolean
  creditAmount?: number
  creditDays?: number
  pendingPayments?: number
  reservedCredit?: number
  sumAmount?: number
  verifiedPayments?: number
  // lo que manda la API real: el crédito va anidado y las facturas dentro de saleInformation
  creditInformation?: { quota?: number; subtract?: number; days?: number } | null
  saleInformation?: WalletBillDto[] | null
}

// POST /wallet/internal (models.WalletBills): una factura (venta a crédito) del cliente
export interface WalletBillDto {
  saleId: number
  serialCode?: number
  created_at?: string
  creditDays?: number
  totalAmount?: number
  verifiedPayments?: number
  pendingPayments?: number
  invoiceStatus?: string
}

// POST /wallet/summary (models.WalletSummaryResponse)
export interface WalletSummaryDto {
  totalCreditExtended?: number
  totalOutstandingDebt?: number
  totalAvailableCredit?: number
  customersOverdue?: number
  totalCustomersWithCredit?: number
  averageCreditDays?: number
}

// lo que se envía a POST /payments/register para abonar a una factura
export interface PaymentInput {
  saleId: number
  amount: number
  remainingAmount: number // lo que queda por pagar de esa factura después del abono
}

// lo que se envía a PUT /users/credit
export interface CreditUpdateInput {
  customerId: number
  quota: number // cupo
  days: number // plazo en días
  isCredit: boolean
}
