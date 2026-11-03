// CreditClientRow · fila de un cliente: nombre, documento, plazo, cupo, saldo, disponible y la acción «Ver estado» (ícono sin borde, RowActions)
// conecta con: wallet.slice (seleccionar cliente); la pinta CreditClientsTable
import React from 'react'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { setSelectedCustomer } from '../../slices/wallet.slice'
import type { CreditClientRowProps } from '../../types/wallet.table.types'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import './CreditClientRow.css'

export const CreditClientRow: React.FC<CreditClientRowProps> = ({ customer: cust, isSelected }) => {
  const dispatch = useAppDispatch()

  return (
    <tr
      className={`credit-table-row ${isSelected ? 'credit-table-row-selected' : ''}`}
      onClick={() => dispatch(setSelectedCustomer(cust))}
    >
      <td>
        <div className="credit-table-cust-business-name">{cust.businessName}</div>
        <div className="credit-table-cust-document">Documento: {cust.documentId}</div>
      </td>
      <td>
        <div className="credit-table-cust-contact">{cust.creditDays} días de plazo</div>
        <div className="credit-table-cust-city">Reservado: {formatCOP(cust.reservedCredit)}</div>
      </td>
      <td className="table-amount">{formatCOP(cust.creditLimit)}</td>
      <td className="table-amount credit-table-text-rose">
        {formatCOP(cust.usedCredit)}
      </td>
      <td className="table-amount credit-table-text-emerald">
        {formatCOP(cust.availableCredit)}
      </td>
      <td>
        <RowActions actions={[{ key: 'view', label: 'Ver estado de cuenta', icon: eyeIcon, onClick: () => dispatch(setSelectedCustomer(cust)) }]} />
      </td>
    </tr>
  )
}

export default CreditClientRow
