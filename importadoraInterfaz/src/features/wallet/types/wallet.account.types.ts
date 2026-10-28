// wallet.account.types · props de las partes del estado de cuenta (detalle, abono, cupo y facturas)
// conecta con: CreditAccountDetail, CreditAccountMetrics, CreditPaymentForm, CreditLimitForm, CreditInvoiceList, CreditInvoiceCard
import type { LoadStatus } from '@/api'
import type { CreditInvoice, CustomerCreditProfile } from './wallet.types'

export interface CreditAccountDetailProps {
  customer: CustomerCreditProfile
}

export interface CreditAccountMetricsProps {
  usedCredit: number
  availableCredit: number
  creditLimit: number
}

export interface CreditPaymentFormProps {
  amount: string
  disabled: boolean // true mientras el backend procesa un abono
  onAmountChange: (value: string) => void
  onSubmit: () => void
}

export interface CreditLimitFormProps {
  customer: CustomerCreditProfile
  disabled: boolean // true mientras el backend procesa un cambio
}

export interface CreditInvoiceListProps {
  invoices: CreditInvoice[]
  status: LoadStatus
  error: string | null
  disabled: boolean
  onPayInvoice: (saleId: number, amount: number) => void
}

export interface CreditInvoiceCardProps {
  invoice: CreditInvoice
  disabled: boolean
  onPay: (saleId: number, amount: number) => void
}
