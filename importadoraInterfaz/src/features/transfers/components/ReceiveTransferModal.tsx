// ReceiveTransferModal · modal de recepción de traslado en destino o reporte de novedades
// conecta con: transfers.service (approveTransfer, rejectTransfer) y ValidatedInput
import React, { useState } from 'react'
import './CreateTransferModal.css'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { approveTransfer, rejectTransfer } from '../services/transfers.service'
import type { TrasladeItem } from '../types/transfers.types'

interface Props {
  isOpen: boolean
  transfer: TrasladeItem | null
  onClose: () => void
  onSuccess: () => void
}

export const ReceiveTransferModal: React.FC<Props> = ({ isOpen, transfer, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'approve' | 'reject'>('approve')
  const [inputCode, setInputCode] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !transfer) return null

  const handleAction = async () => {
    try {
      setIsSubmitting(true)
      setErrorMsg(null)
      if (mode === 'approve') {
        const num = parseInt(inputCode, 10)
        if (isNaN(num)) {
          setErrorMsg('Digita el código numérico de seguridad')
          return
        }
        await approveTransfer(transfer.saleId, num)
      } else {
        if (!rejectReason.trim()) {
          setErrorMsg('Escribe el motivo detallado de la novedad o faltante')
          return
        }
        await rejectTransfer(transfer.saleId, rejectReason.trim())
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el traslado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="transfer-modal-backdrop" role="dialog" aria-modal="true">
      <div className="transfer-modal-card">
        <div className="transfer-modal-header">
          <h3 className="transfer-modal-title">Recepción de Traslado #{transfer.saleId}</h3>
          <button type="button" className="transfer-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="transfer-modal-body">
          <div className="transfer-grid-2cols">
            <div>
              <small className="transfer-select-label">Origen</small>
              <strong>{transfer.originWarehouse.name}</strong>
            </div>
            <div>
              <small className="transfer-select-label">Destino</small>
              <strong>{transfer.destWarehouse.name}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              className={mode === 'approve' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMode('approve')}
            >
              ✓ Aprobación Física (Sin Novedad)
            </button>
            <button
              type="button"
              className={mode === 'reject' ? 'btn-danger' : 'btn-secondary'}
              onClick={() => setMode('reject')}
            >
              ⚠ Reportar Novedad / Faltante
            </button>
          </div>

          {mode === 'approve' ? (
            <div style={{ marginTop: '1rem' }}>
              <ValidatedInput
                id="receive-code"
                label="Código Único de Entrega (Serial)"
                placeholder="Ingresa el serial entregado por el conductor..."
                value={inputCode}
                onChange={(val) => setInputCode(val)}
                maxLength={10}
                required
                error={errorMsg ?? undefined}
                helperText="El código debe coincidir con el serial emitido en el despacho."
              />
            </div>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              <ValidatedInput
                id="reject-reason"
                label="Motivo de Novedad o Avería"
                placeholder="Detalla qué repuestos llegaron dañados o incompletos..."
                value={rejectReason}
                onChange={(val) => setRejectReason(val)}
                maxLength={120}
                required
                error={errorMsg ?? undefined}
              />
            </div>
          )}
        </div>

        <div className="transfer-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className={mode === 'approve' ? 'btn-primary' : 'btn-danger'}
            disabled={isSubmitting}
            onClick={handleAction}
          >
            {isSubmitting ? 'Guardando...' : mode === 'approve' ? 'Confirmar Recepción' : 'Registrar Novedad'}
          </button>
        </div>
      </div>
    </div>
  )
}
