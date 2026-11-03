// ReturnRow · una fila de la tabla de devoluciones, con la insignia de resolución, el estado y los botones aprobar o rechazar si está pendiente
// conecta con: ReturnsTable; formatea con global/helpers/format y etiquetas de returns.constants
import React from 'react'
import { formatCurrency, formatDate } from '@/global/helpers/format'
import { RESOLUTION_LABELS, STATUS_LABELS } from '../constants/returns.constants'
import type { ReturnDto } from '../types/returns.types'

interface Props {
  ret: ReturnDto
  onApprove: (ret: ReturnDto) => void
  onReject: (ret: ReturnDto) => void
}

export const ReturnRow: React.FC<Props> = ({ ret, onApprove, onReject }) => {
  const resolution = RESOLUTION_LABELS[ret.resolutionType]
  return (
    <tr>
      <td><strong>#{ret.id}</strong></td>
      <td><span className="ret-serial-pill">{ret.saleSerial || `VTA-${ret.saleId}`}</span></td>
      <td><strong className="returns-table-wh">{ret.warehouseName || (ret.warehouseId ? `Bodega #${ret.warehouseId}` : 'Sede Principal')}</strong></td>
      <td>{formatDate(ret.createdAt)}</td>
      <td><span className="ret-customer-name">{ret.customerName || 'Cliente General'}</span></td>
      <td><span className="ret-reason-text" title={ret.reason}>{ret.reason}</span></td>
      <td>
        <span className={`ret-badge is-${ret.resolutionType === 'credit_balance' ? 'credit' : ret.resolutionType}`}>
          {resolution ? `${resolution.icon} ${resolution.text}` : ret.resolutionType}
        </span>
      </td>
      <td><strong>{formatCurrency(ret.total)}</strong></td>
      <td><span className={`ret-status-pill is-${ret.status}`}>{STATUS_LABELS[ret.status] ?? STATUS_LABELS.pending}</span></td>
      <td className="returns-td-actions">
        {ret.status === 'pending' ? (
          <div className="ret-action-btns">
            <button type="button" className="ret-btn-approve" onClick={() => onApprove(ret)} title="Aprobar Devolución">✓ Aprobar</button>
            <button type="button" className="ret-btn-reject" onClick={() => onReject(ret)} title="Rechazar Devolución">✕ Rechazar</button>
          </div>
        ) : (
          <span className="ret-action-done">Completada</span>
        )}
      </td>
    </tr>
  )
}
