// AbonoDetailPanel · detalle de un abono o recaudo en el panel derecho: recibo, cliente, bodega, venta, método, quién lo registró y verificó, comprobante y acciones de verificación/anulación
// conecta con: AbonosTable (lo abre con «abonoDetail»), formRegistry, wallet.payments.thunks (verifyPaymentThunk, voidPaymentThunk)
import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './AbonoDetailPanel.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { verifyPaymentThunk, voidPaymentThunk } from '../../thunks/wallet.payments.thunks'
import type { AbonoRecord } from '../../types/wallet.types'

const STATUS: Record<AbonoRecord['status'], { label: string; tone: PillTone }> = {
  verified: { label: 'Verificado', tone: 'green' },
  pending: { label: 'En revisión', tone: 'amber' },
  rejected: { label: 'Rechazado', tone: 'red' },
  void: { label: 'Anulado', tone: 'gray' },
}

export const AbonoDetailPanel: React.FC<{ abono: AbonoRecord }> = ({ abono }) => {
  const dispatch = useAppDispatch()
  const [isProcessing, setIsProcessing] = useState(false)
  const status = STATUS[abono.status]
  const warehouse = [abono.warehouseCode, abono.warehouseName].filter(Boolean).join(' · ')
  const rows: Array<[string, React.ReactNode]> = [
    ['Recibo', abono.serialCode],
    ['Fecha', abono.date || '—'],
    ['Cliente', abono.customerName],
    ['Identificación', abono.customerDoc],
    ['Bodega', warehouse || 'Sin bodega'],
    ['Venta o documento', abono.saleSerial || '—'],
    ['Método', abono.method === 'cash' ? 'Efectivo' : 'Transferencia'],
    ['Referencia', abono.reference || '—'],
    ['Monto', <strong key="amount">{formatCOP(abono.amount)}</strong>],
    ['Estado', <Pill key="status" tone={status.tone}>{status.label}</Pill>],
    ['Registrado por', abono.employeeName || '—'],
    ['Verificado por', abono.verifiedByName || (abono.status === 'pending' ? 'Aún sin verificar' : '—')],
  ]

  const handleVerify = async () => {
    setIsProcessing(true)
    try {
      await dispatch(verifyPaymentThunk({ paymentId: abono.id })).unwrap()
      dispatch(closeDrawerForm())
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVoid = async () => {
    const reason = window.prompt('Ingrese el motivo de anulación del abono:')
    if (!reason || reason.trim() === '') return

    setIsProcessing(true)
    try {
      await dispatch(voidPaymentThunk({ paymentId: abono.id, reason: reason.trim() })).unwrap()
      dispatch(closeDrawerForm())
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <dl className="abono-detail">
          {rows.map(([label, value]) => (
            <div key={label} className="abono-detail-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {abono.note && <div className="drawer-form-note">{abono.note}</div>}
        {abono.proofUrl && (
          <div className="drawer-form-field">
            <span className="drawer-form-label">Comprobante</span>
            <img className="abono-detail-proof" src={abono.proofUrl} alt={`Comprobante del recibo ${abono.serialCode}`} />
          </div>
        )}
      </div>
      <div className="drawer-form-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {abono.status === 'pending' && (
          <button
            type="button"
            className="btn-primary"
            style={{ backgroundColor: 'var(--success-600, #16a34a)', borderColor: 'var(--success-600, #16a34a)' }}
            onClick={handleVerify}
            disabled={isProcessing}
          >
            {isProcessing ? 'Verificando...' : 'Verificar Pago'}
          </button>
        )}
        {abono.status !== 'void' && (
          <button
            type="button"
            className="btn-danger"
            style={{ backgroundColor: 'var(--danger-600, #dc2626)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
            onClick={handleVoid}
            disabled={isProcessing}
          >
            {isProcessing ? 'Anulando...' : 'Anular Pago'}
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default AbonoDetailPanel
