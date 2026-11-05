// ReturnRow · una fila de la tabla de devoluciones, con la insignia de resolución, el estado y las acciones aprobar o rechazar heredadas de RowActions
// conecta con: ReturnsTable, RowActions; formatea con global/helpers/formatting/format y etiquetas de returns.constants
import React from 'react'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatCurrency, formatDate } from '@/global/helpers/formatting/format'
import checkIcon from '@/assets/icons/check.svg?raw'
import banIcon from '@/assets/icons/ban.svg?raw'
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
          {resolution ? resolution.text : ret.resolutionType}
        </span>
      </td>
      <td><strong>{formatCurrency(ret.total)}</strong></td>
      <td><span className={`ret-status-pill is-${ret.status}`}>{STATUS_LABELS[ret.status] ?? STATUS_LABELS.pending}</span></td>
      <td className="returns-td-actions">
        <RowActions
          actions={[
            {
              key: 'approve',
              label: `Aprobar devolución #${ret.id}`,
              icon: checkIcon,
              tone: 'success',
              visible: ret.status === 'pending',
              onClick: () => onApprove(ret),
            },
            {
              key: 'reject',
              label: `Rechazar devolución #${ret.id}`,
              icon: banIcon,
              tone: 'danger',
              visible: ret.status === 'pending',
              onClick: () => onReject(ret),
            },
          ]}
        />
      </td>
    </tr>
  )
}
