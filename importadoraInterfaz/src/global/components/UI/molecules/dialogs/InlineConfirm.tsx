// InlineConfirm · confirmación dentro del propio panel lateral (no flota): un aviso fijo al pie con el mensaje y los botones Cancelar y Confirmar
// conecta con: InlineConfirm.css; lo usan los paneles que ya están abiertos en el panel derecho (detalle de compra, cliente), donde abrir otro formulario cerraría el panel
// ojo: no pide texto; si la acción necesita motivo se usa ReasonPrompt (features/reasonPrompt), que abre el formulario en el panel derecho
import React from 'react'
import './InlineConfirm.css'

interface InlineConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const InlineConfirm: React.FC<InlineConfirmProps> = ({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) => {
  if (!open) return null
  return (
    <div className="inline-confirm" role="alert">
      <strong className="inline-confirm-title">{title}</strong>
      <p className="inline-confirm-message">{message}</p>
      <div className="inline-confirm-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  )
}

export default InlineConfirm
