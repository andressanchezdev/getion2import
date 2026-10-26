// CreateCustomerModal · modal blindado de registro de clientes con validación asíncrona
// conecta con: ValidatedInput, validation.helpers, useAsyncValidation y POST /users/quick-register
import React, { useState } from 'react'
import './CreateCustomerModal.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS, VALIDATORS } from '@/global/helpers/validation.helpers'
import { useAsyncValidation } from '@/global/hooks/useAsyncValidation'
import { apiClient, API_CONFIG } from '@/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateCustomerModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAppSelector((state) => state.auth)
  const [doc, setDoc] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    emailAsyncError,
    docAsyncError,
    validateEmailDebounced,
    validateDocumentDebounced,
    resetAsyncErrors,
  } = useAsyncValidation()

  if (!isOpen) return null

  const handleDocChange = (val: string) => {
    setDoc(val)
    if (val.length >= 6) validateDocumentDebounced(val)
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (user?.companyId && VALIDATORS.isValidEmail(val)) {
      validateEmailDebounced(val, user.companyId)
    }
  }

  const isDocValid = VALIDATORS.isValidDocument(doc)
  const isNameValid = VALIDATORS.isValidName(name)
  const isPhoneValid = VALIDATORS.isValidPhone(phone)
  const isEmailValid = email ? VALIDATORS.isValidEmail(email) : true

  const canSubmit =
    isDocValid && isNameValid && isPhoneValid && isEmailValid &&
    !docAsyncError && !emailAsyncError && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user?.companyId) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      await apiClient.post(API_CONFIG.ENDPOINTS.USERS.QUICK_REGISTER, {
        companyId: user.companyId,
        identification: doc,
        name: name.trim(),
        userType: 'client',
        phone,
        email: email.trim(),
      })
      onSuccess()
      onClose()
      resetAsyncErrors()
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Error al registrar el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="customer-modal-backdrop" role="dialog" aria-modal="true">
      <div className="customer-modal-card">
        <div className="customer-modal-header">
          <h3 className="customer-modal-title">Registrar Nuevo Cliente</h3>
          <button type="button" className="customer-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="customer-modal-body">
            <ValidatedInput
              id="cust-doc"
              label="Documento de Identidad (Cédula o NIT)"
              value={doc}
              onChange={handleDocChange}
              sanitize={SANITIZERS.numericOnly}
              maxLength={15}
              required
              error={doc && !isDocValid ? 'Mínimo 6 y máximo 15 dígitos' : docAsyncError ?? undefined}
              placeholder="Ej: 10203040"
            />
            <ValidatedInput
              id="cust-name"
              label="Nombre Completo o Razón Social"
              value={name}
              onChange={setName}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              required
              error={name && !isNameValid ? 'Nombre inválido (3-60 caracteres)' : undefined}
              placeholder="Ej: Juan Pérez"
            />
            <ValidatedInput
              id="cust-phone"
              label="Teléfono Celular"
              value={phone}
              onChange={setPhone}
              sanitize={SANITIZERS.numericOnly}
              maxLength={10}
              required
              error={phone && !isPhoneValid ? 'Debe tener 10 dígitos (inicia en 3)' : undefined}
              placeholder="Ej: 3001234567"
            />
            <ValidatedInput
              id="cust-email"
              label="Correo Electrónico"
              value={email}
              onChange={handleEmailChange}
              sanitize={SANITIZERS.trim}
              maxLength={60}
              type="email"
              error={email && !isEmailValid ? 'Formato no válido' : emailAsyncError ?? undefined}
              placeholder="cliente@ejemplo.com"
            />
            {submitError && <div className="form-field-error-msg">{submitError}</div>}
          </div>

          <div className="customer-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCustomerModal
