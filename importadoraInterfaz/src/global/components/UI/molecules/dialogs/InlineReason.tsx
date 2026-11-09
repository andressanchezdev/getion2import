// InlineReason · motivo dentro del propio panel lateral (no flota): aviso fijo al pie con un campo de motivo de 10 a 100 caracteres y los botones Cancelar y Confirmar
// conecta con: InlineReason.css; lo usan los paneles que ya están abiertos en el panel derecho (detalle de compra y de abono), donde abrir otro formulario cerraría el panel
// ojo: Confirmar solo se enciende con un motivo válido; el texto se borra al cerrar; en tablas se usa ReasonPrompt (features/reasonPrompt), que abre el formulario en el panel derecho
import React, { useState } from 'react'
import './InlineReason.css'

interface InlineReasonProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

const MIN_LENGTH = 10
const MAX_LENGTH = 100

const InlineReasonForm: React.FC<Omit<InlineReasonProps, 'open'>> = ({ title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) => {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  const valid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH

  return (
    <form
      className="inline-reason"
      role="alert"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onConfirm(trimmed)
      }}
    >
      <strong className="inline-reason-title">{title}</strong>
      <p className="inline-reason-message">{message}</p>
      <label className="drawer-form-label" htmlFor="inline-reason-text">Motivo *</label>
      <textarea id="inline-reason-text" className="drawer-form-control" rows={2} value={reason} maxLength={MAX_LENGTH} onChange={(e) => setReason(e.target.value)} placeholder={`Entre ${MIN_LENGTH} y ${MAX_LENGTH} caracteres`} autoFocus required />
      <span className="drawer-form-hint">{trimmed.length}/{MAX_LENGTH}</span>
      <div className="inline-reason-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!valid}>{confirmLabel}</button>
      </div>
    </form>
  )
}

export const InlineReason: React.FC<InlineReasonProps> = ({ open, ...rest }) => (open ? <InlineReasonForm {...rest} /> : null)

export default InlineReason
