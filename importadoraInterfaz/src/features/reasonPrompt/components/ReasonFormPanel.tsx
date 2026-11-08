// ReasonFormPanel · formulario del panel derecho que pide un motivo (o nota): mensaje, campo con contador y botones Cancelar y Confirmar
// conecta con: formRegistry (reasonForm), reasonRequests (entrega la respuesta) y navigation (closeDrawerForm); sigue el mismo diseño de los demás formularios laterales
// ojo: si el panel se cierra sin confirmar (Cancelar, la ✕ o abrir otro) la petición se resuelve con null
import React, { useEffect, useRef, useState } from 'react'
import './ReasonFormPanel.css'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { REASON_MAX, REASON_MIN } from '../constants/reasonPrompt.constants'
import { settleReasonRequest } from '../helpers/reasonRequests'
import type { ReasonFormPayload } from '../types/reasonPrompt.types'

interface ReasonFormPanelProps {
  payload: ReasonFormPayload
}

export const ReasonFormPanel: React.FC<ReasonFormPanelProps> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const { requestId, message, confirmLabel = 'Confirmar', fieldLabel = 'Motivo', placeholder, minLength = REASON_MIN, maxLength = REASON_MAX, field = true } = payload
  const [text, setText] = useState('')
  const alive = useRef(true)
  const length = text.trim().length
  const valid = !field || (length >= minLength && length <= maxLength)
  const required = field && minLength > 0

  // al desmontarse sin haber confirmado, quien esperaba recibe null; el microtask evita que el doble montaje de desarrollo lo cancele por error
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      queueMicrotask(() => {
        if (!alive.current) settleReasonRequest(requestId, null)
      })
    }
  }, [requestId])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid) return
    settleReasonRequest(requestId, text.trim())
    dispatch(closeDrawerForm())
  }

  return (
    <form className="reason-form-panel" onSubmit={submit}>
      <div className="reason-form-body">
        <p className="reason-form-message">{message}</p>
        {field && (
        <div className="reason-form-field">
          <label htmlFor="reason-form-input">{fieldLabel}{required ? ' *' : ''}</label>
          <textarea
            id="reason-form-input"
            className="reason-form-textarea"
            rows={4}
            value={text}
            maxLength={maxLength}
            placeholder={placeholder ?? (required ? `Indica el motivo (${minLength} a ${maxLength} caracteres)…` : 'Opcional')}
            onChange={(event) => setText(event.target.value)}
            autoFocus
          />
          <span className="reason-form-hint">{length}/{maxLength}{required ? ` (mínimo ${minLength})` : ''}</span>
        </div>
        )}
      </div>

      <div className="reason-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!valid}>
          {confirmLabel}
        </button>
      </div>
    </form>
  )
}

export default ReasonFormPanel
