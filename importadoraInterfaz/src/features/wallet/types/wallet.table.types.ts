// wallet.table.types · props de las partes de la tabla de clientes
// conecta con: CreditClientRow (la pinta CreditClientsTable) y CreditStatusBadge (la pinta CreditClientRow)
import type { CreditStatus, CustomerCreditProfile } from './wallet.types'

export interface CreditClientRowProps {
  customer: CustomerCreditProfile
  isSelected: boolean
}

export interface CreditStatusBadgeProps {
  status: CreditStatus
}
