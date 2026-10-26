// CreditClientRow · fila de un cliente: nombre, documento, plazo, cupo, saldo, disponible, estado y botón con ícono "Ver Estado"
// conecta con: wallet.slice (seleccionar cliente); partes: CreditStatusBadge; la pinta CreditClientsTable
import React from 'react'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch } from '@/global/hooks/useRedux'
import { setSelectedCustomer } from '../../slices/wallet.slice'
import type { CreditClientRowProps } from '../../types/wallet.table.types'
import { CreditStatusBadge } from './CreditStatusBadge'
import eyeIcon from '@/assets/icons/eye.svg'
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
      <td className="credit-table-cust-currency credit-table-font-mono">{formatCOP(cust.creditLimit)}</td>
      <td className="credit-table-cust-currency credit-table-font-mono credit-table-font-semibold credit-table-text-rose">
        {formatCOP(cust.usedCredit)}
      </td>
      <td className="credit-table-cust-currency credit-table-font-mono credit-table-text-emerald">
        {formatCOP(cust.availableCredit)}
      </td>
      <td>
        <CreditStatusBadge status={cust.creditStatus} />
      </td>
      <td className="credit-table-cell-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch(setSelectedCustomer(cust))
          }}
          className="credit-table-btn-detail"
          aria-label="Ver estado"
          title="Ver estado de cuenta"
        >
          <img src={eyeIcon} alt="" className="credit-table-btn-detail-icon" />
        </button>
      </td>
    </tr>
  )
}

export default CreditClientRow
