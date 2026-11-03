// EditCustomerForm · edición de un cliente (nombre, teléfono y correo) en el panel derecho; el documento se muestra pero no se cambia
// conecta con: formRegistry (lo muestra), customers.thunks (cargar el detalle y guardar: PUT /customers/:id), useCustomerExists (correo repetido), navigation (closeDrawerForm) y ValidatedInput
// ojo: el documento identifica al cliente (facturas y cartera), por eso es de solo lectura; el correo solo se revisa contra duplicados si cambió
import React, { useEffect, useState } from 'react'
import './CreateCustomerForm.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { ValidatedInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS, VALIDATORS } from '@/global/helpers/validation/validation.helpers'
import { useAsyncValidation } from '@/global/hooks/data/useAsyncValidation'
import { toast } from '@/global/helpers/feedback/toast'
import { useCustomerExists } from '../../hooks/useCustomerExists'
import { loadCustomerDetailThunk, loadCustomersThunk, updateCustomerThunk } from '../../thunks/customers.thunks'
import type { CustomerDetail } from '../../types/customers.types'

interface EditCustomerFormProps {
  customerId: number
}

export const EditCustomerForm: React.FC<EditCustomerFormProps> = ({ customerId }) => {
  const dispatch = useAppDispatch()
  const [original, setOriginal] = useState<CustomerDetail | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { emailAsyncError, validateEmailDebounced, resetAsyncErrors } = useAsyncValidation(useCustomerExists())

  useEffect(() => {
    let cancelled = false
    dispatch(loadCustomerDetailThunk(customerId))
      .unwrap()
      .then((detail) => {
        if (cancelled) return
        setOriginal(detail)
        setName(detail.fullName)
        setPhone(detail.company.phone ? String(detail.company.phone) : '')
        setEmail(detail.email)
      })
      .catch((message) => !cancelled && setLoadError(typeof message === 'string' ? message : 'No se pudo cargar el cliente.'))
    return () => {
      cancelled = true
    }
  }, [dispatch, customerId])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (VALIDATORS.isValidEmail(value) && value.trim().toLowerCase() !== (original?.email ?? '').toLowerCase()) validateEmailDebounced(value)
  }

  const isNameValid = VALIDATORS.isValidName(name)
  const isPhoneValid = phone === '' || VALIDATORS.isValidPhone(phone)
  const isEmailValid = email ? VALIDATORS.isValidEmail(email) : true
  const canSubmit = Boolean(original) && isNameValid && isPhoneValid && isEmailValid && !emailAsyncError && !isSubmitting

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      // ojo: el campo muestra el nombre completo (nombre + apellido); si cambia se guarda entero como nombre y se vacía el apellido, para que no se duplique
      const nameChanged = name.trim() !== (original?.fullName ?? '')
      const body = { ...(nameChanged ? { name: name.trim(), lastName: '' } : {}), phone, email: email.trim() }
      await dispatch(updateCustomerThunk({ id: customerId, body })).unwrap()
      toast.success('Cliente actualizado')
      dispatch(loadCustomersThunk())
      dispatch(loadCustomerDetailThunk(customerId))
      dispatch(closeDrawerForm())
      resetAsyncErrors()
    } catch (message) {
      setSubmitError(typeof message === 'string' ? message : 'Error al actualizar el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadError) return <div className="customer-form-body"><div className="form-field-error-msg">{loadError}</div></div>
  if (!original) return <div className="customer-form-body">Cargando cliente…</div>

  return (
    <form onSubmit={handleSubmit} className="customer-form">
      <div className="customer-form-body">
        <ValidatedInput id="edit-cust-doc" label="Documento (no se puede cambiar)" value={original.identification} onChange={() => undefined} disabled />
        <ValidatedInput
          id="edit-cust-name"
          label="Nombre Completo o Razón Social"
          value={name}
          onChange={setName}
          sanitize={SANITIZERS.trim}
          maxLength={60}
          required
          error={name && !isNameValid ? 'Nombre inválido (3-60 caracteres)' : undefined}
        />
        <ValidatedInput
          id="edit-cust-phone"
          label="Teléfono Celular"
          value={phone}
          onChange={setPhone}
          sanitize={SANITIZERS.numericOnly}
          maxLength={10}
          error={phone && !isPhoneValid ? 'Debe tener 10 dígitos (inicia en 3)' : undefined}
        />
        <ValidatedInput
          id="edit-cust-email"
          label="Correo Electrónico"
          value={email}
          onChange={handleEmailChange}
          sanitize={SANITIZERS.trim}
          maxLength={60}
          type="email"
          error={email && !isEmailValid ? 'Formato no válido' : emailAsyncError ?? undefined}
        />
        {submitError && <div className="form-field-error-msg">{submitError}</div>}
      </div>

      <div className="customer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default EditCustomerForm
