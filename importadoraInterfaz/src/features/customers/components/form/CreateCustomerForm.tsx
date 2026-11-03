// CreateCustomerForm · formulario de registro de clientes con validación asíncrona; se abre en el panel derecho (Nuevo Cliente)
// conecta con: drawerRegistry/formRegistry (lo muestra), navigation (closeDrawerForm), ValidatedInput, validation.helpers, useAsyncValidation, useCustomerExists y customers.thunks (createCustomerThunk: POST /customers)
import React, { useState } from 'react'
import './CreateCustomerForm.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS, VALIDATORS } from '@/global/helpers/validation/validation.helpers'
import { useAsyncValidation } from '@/global/hooks/data/useAsyncValidation'
import { useCustomerExists } from '../../hooks/useCustomerExists'
import { createCustomerThunk, loadCustomersThunk } from '../../thunks/customers.thunks'

export const CreateCustomerForm: React.FC = () => {
  const dispatch = useAppDispatch()
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
  } = useAsyncValidation(useCustomerExists())

  const handleDocChange = (val: string) => {
    setDoc(val)
    if (val.length >= 6) validateDocumentDebounced(val)
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (VALIDATORS.isValidEmail(val)) validateEmailDebounced(val)
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
    if (!canSubmit || !user) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      // ojo: por ahora se registra como persona natural con cédula; la compañía la toma la API del token
      await dispatch(
        createCustomerThunk({
          documentType: 'CC',
          document: doc,
          personType: 'natural',
          name: name.trim(),
          phone,
          ...(email.trim() && { email: email.trim() }),
        })
      ).unwrap()
      dispatch(loadCustomersThunk())
      dispatch(closeDrawerForm())
      resetAsyncErrors()
    } catch (message) {
      setSubmitError(typeof message === 'string' ? message : 'Error al registrar el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="customer-form">
          <div className="customer-form-body">
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

          <div className="customer-form-footer">
            <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
    </form>
  )
}

export default CreateCustomerForm
