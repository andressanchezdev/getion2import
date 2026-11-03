// wallet.api.types · lo que responde la API en Go en cartera (clientes con crédito, ventas a crédito y reporte) y los datos que se envían al pagar o cambiar el cupo
// conecta con: wallet.adapter (convierte a los tipos de la app), wallet.service y wallet.payments.service (los piden y envían)
// ojo: nombres tal cual del backend (CustomerResponse, CustomerSelectorResponse, SaleResponse y WalletDashboardReport); la app solo usa los tipos de wallet.types

// GET /customers?creditEnabled=true: un cliente con su crédito (cupo y plazo)
export interface WalletCustomerDto {
  id: number
  document?: string
  name?: string
  lastName?: string | null
  tradeName?: string | null
  creditEnabled?: boolean
  creditLimit?: number
  creditDays?: number
  status?: string // 'active' | 'overdue' (en mora) | ...
}

// GET /customers/selector: de cada cliente solo se usa lo que le queda de cupo
export interface WalletSelectorDto {
  id: number
  availableCredit?: number
}

// GET /sales?customerId=&paymentMethod=credit: una venta a crédito del cliente (una «factura» de cartera)
export interface WalletSaleDto {
  id: number
  serialCode?: string
  total?: number
  paidTotal?: number
  saleAt?: string | null
  createdAt?: string
  dueDate?: string | null // AAAA-MM-DD: la API lo calcula con los días de crédito del cliente
  status?: string
}

// GET /reports/wallet
export interface WalletReportDto {
  totalCustomersWithCredit?: number
  totalOutstandingDebt?: number // por cobrar; la API lo manda negativo
  totalStoreCreditBalance?: number // saldos a favor de clientes
}

// lo que se envía para abonar a una factura (POST /payments)
export interface PaymentInput {
  saleId: number
  amount: number
  remainingAmount: number // lo que queda por pagar de esa factura después del abono (la API en Go no lo pide; solo sirve para repartir el abono)
}

// cómo se recibió un abono: en efectivo (se verifica en seguida) o por transferencia (queda en revisión hasta conciliarlo con el banco)
export interface PaymentDetails {
  method: 'cash' | 'transfer'
  reference?: string
  proofUrl?: string
}

// lo que se envía para cambiar el cupo y el plazo (PUT /customers/:id)
export interface CreditUpdateInput {
  customerId: number
  quota: number // cupo
  days: number // plazo en días
  isCredit: boolean
}

// un pago como lo responde GET /payments; los nombres cambian según la versión del backend, por eso casi todo es opcional y el adapter rellena lo que falta
export interface PaymentHistoryDto {
  id?: number
  serialCode?: string
  serialPayment?: string
  createdAt?: string
  date?: string
  customerName?: string
  userName?: string
  customerDoc?: string
  identification?: string
  saleSerial?: string
  saleId?: number
  paymentMethod?: string
  method?: string
  reference?: string
  amount?: number
  status?: string
  warehouseId?: number
  warehouseCode?: string
  warehouseName?: string
  employeeName?: string // quien registró el pago
  verifiedByName?: string | null
  proofUrl?: string | null
  issueNote?: string | null
}

// un cliente como lo responde GET /customers/search (para elegir a quién habilitar crédito)
export interface CreditCustomerDto {
  id: number | string
  businessName?: string
  name?: string
  contactName?: string
  identification?: string
  document?: string
  email?: string
  creditLimit?: number
  creditDays?: number
  isCredit?: boolean
  creditEnabled?: boolean
}
