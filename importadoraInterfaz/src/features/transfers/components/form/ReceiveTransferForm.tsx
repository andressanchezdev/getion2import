// ReceiveTransferForm · confirmación de aceptación del traslado (OK completo o con novedad) en el panel derecho
// conecta con: formRegistry (lo muestra), transfers.thunks (acepta el traslado), CreateTransferForm.css (estilos compartidos del formulario) y ReceiveTransferForm.css
import React, { useState } from 'react'
import './TransferFormShell.css'
import './ReceiveTransferForm.css'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { acceptTransferThunk } from '../../thunks/transfers.thunks'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { toast } from '@/global/helpers/feedback/toast'
import type { TrasladeItem } from '../../types/transfers.types'

interface Props {
  transfer: TrasladeItem
}

export const ReceiveTransferForm: React.FC<Props> = ({ transfer }) => {
  const dispatch = useAppDispatch()
  const [decision, setDecision] = useState<'ok' | 'novelty'>('ok')
  const [noveltyNotes, setNoveltyNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      setErrorMsg(null)

      if (decision === 'novelty' && !noveltyNotes.trim()) {
        setErrorMsg('Por favor detalla la novedad, faltante o daño de los repuestos.')
        setIsSubmitting(false)
        return
      }

      await dispatch(acceptTransferThunk({ transfer, noveltyNotes: decision === 'novelty' ? noveltyNotes.trim() : undefined })).unwrap()

      if (decision === 'ok') {
        toast.success(`Traslado ${transfer.serialCode} aceptado OK completo.`)
      } else {
        toast.warning(`Traslado ${transfer.serialCode} registrado con novedad (Prioridad Alta para gestión).`)
      }

      dispatch(closeDrawerForm())
    } catch (message) {
      setErrorMsg(typeof message === 'string' ? message : 'Error al procesar la aceptación del traslado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="transfer-form">
      <div className="transfer-form-body">
        <div className="transfer-grid-2cols">
          <div>
            <small className="transfer-select-label">Bodega origen</small>
            <strong>{transfer.originWarehouse.name}</strong>
          </div>
          <div>
            <small className="transfer-select-label">Bodega destino</small>
            <strong>{transfer.destWarehouse.name}</strong>
          </div>
        </div>

        <p className="receive-transfer-note">
          <strong>Despachado por:</strong> {transfer.dispatchedByEmployeeName || 'Empleado en origen'}
        </p>

        <div className="receive-transfer-section">
          <span className="transfer-select-label">Estado de recepción física en destino</span>
          <div className="receive-transfer-options">
            <button
              type="button"
              className={`receive-transfer-option ${decision === 'ok' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setDecision('ok')
                setErrorMsg(null)
              }}
            >
              OK completo
              <small>Sin novedad ni averías</small>
            </button>

            <button
              type="button"
              className={`receive-transfer-option ${decision === 'novelty' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                setDecision('novelty')
                setErrorMsg(null)
              }}
            >
              Con novedad
              <small>Faltante, avería o daño</small>
            </button>
          </div>
        </div>

        {decision === 'ok' ? (
          <div className="receive-transfer-section receive-transfer-summary">
            <strong>Recepción conforme</strong>
            <p>Se ingresarán al stock de destino todos los repuestos indicados:</p>
            <ul>
              {transfer.products.map((p) => (
                <li key={p.itemId}>
                  <strong>{p.code || 'Repuesto'}</strong>: {p.description} (x{p.quantity})
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="receive-transfer-section">
            <p className="receive-transfer-warning">
              Al registrar con novedad, el traslado pasará a estado <strong>Con novedad (alta prioridad)</strong> para su posterior resolución por administración.
            </p>
            <ValidatedInput
              id="novelty-notes"
              label="Detalle de la novedad o faltante"
              placeholder="Describe qué repuestos llegaron dañados, incompletos o con discrepancias..."
              value={noveltyNotes}
              onChange={(val) => setNoveltyNotes(val)}
              maxLength={250}
              required
              error={errorMsg ?? undefined}
            />
          </div>
        )}

        {errorMsg && decision === 'ok' && <div className="form-field-error-msg">{errorMsg}</div>}
      </div>

      <div className="transfer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="button" className={decision === 'ok' ? 'btn-primary' : 'btn-danger'} disabled={isSubmitting} onClick={handleConfirm}>
          {isSubmitting ? 'Procesando...' : decision === 'ok' ? 'Confirmar aceptación' : 'Registrar con novedad'}
        </button>
      </div>
    </div>
  )
}

export default ReceiveTransferForm
