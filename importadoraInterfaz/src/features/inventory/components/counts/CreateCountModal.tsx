// CreateCountModal.tsx · modal para iniciar un nuevo conteo físico
import React, { useState } from 'react'
import type { CreateCountInput } from '../../types/inventory.counts.types'

interface Props {
  warehouseId: number
  warehouseName?: string
  onClose: () => void
  onSubmit: (input: CreateCountInput) => Promise<unknown>
}

export const CreateCountModal: React.FC<Props> = ({
  warehouseId,
  warehouseName,
  onClose,
  onSubmit,
}) => {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!warehouseId) return
    setSubmitting(true)
    try {
      await onSubmit({ warehouseId, notes: notes.trim() || undefined })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="count-modal-overlay" onClick={onClose}>
      <div className="count-modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="count-modal-header">
            <h3 className="count-modal-title">Iniciar Conteo Físico</h3>
            <button type="button" className="count-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="count-modal-body">
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Se creará un registro de conteo físico para la bodega <strong>{warehouseName || `#${warehouseId}`}</strong> congelando las existencias esperadas actuales.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
                Observaciones o notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Auditoría física de fin de mes, pasillos A y B..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--c-slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <div className="count-modal-footer">
            <button type="button" className="btn-secondary" disabled={submitting} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || !warehouseId}>
              {submitting ? 'Iniciando…' : 'Iniciar Conteo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

