// wallet.table.types · props de las partes de la tabla de clientes
// conecta con: CreditClientRow (la pinta CreditClientsTable), CreditUsageBar y CreditStatusBadge (las pinta CreditClientRow)
import type { CreditStatus, CustomerCreditProfile } from './wallet.types'

export interface CreditClientRowProps {
  customer: CustomerCreditProfile
  isSelected: boolean
}

export interface CreditUsageBarProps {
  percentage: number
}

export interface CreditStatusBadgeProps {
  status: CreditStatus
}
