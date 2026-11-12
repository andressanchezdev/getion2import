import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CreateCustomerForm.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { VALIDATORS } from '@/global/helpers/validation/validation.helpers'
import { useAsyncValidation } from '@/global/hooks/data/useAsyncValidation'
import { useCustomerExists } from '../../hooks/useCustomerExists'
import { createCustomerThunk, loadCustomersThunk } from '../../thunks/customers.thunks'
import { CustomerFormFields, type CustomerFormValues } from './CustomerFormFields'

const INITIAL_VALUES: CustomerFormValues = {
  documentType: 'CC',
  document: '',
  personType: 'natural',
  name: '',
  lastName: '',
  tradeName: '',
  legalRepresentative: '',
  phone: '',
  mobile: '',
  email: '',
  city: '',
  address: '',
  vatResponsible: false,
  fiscalRespCodes: ['R-99-PN'],
  priceTier: 'p1',
  discountPercent: 0,
  docsValidityMonths: 12,
}

export const CreateCustomerForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const [values, setValues] = useState<CustomerFormValues>(INITIAL_VALUES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    emailAsyncError,
    docAsyncError,
    validateEmailDebounced,
    validateDocumentDebounced,
    resetAsyncErrors,
  } = useAsyncValidation(useCustomerExists())

  const handleFieldChange = <K extends keyof CustomerFormValues>(field: K, val: CustomerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: val }))
  }

  const handleDocChange = (val: string) => {
    if (val.length >= 6) validateDocumentDebounced(val)
  }

  const handleEmailChange = (val: string) => {
    if (VALIDATORS.isValidEmail(val)) validateEmailDebounced(val)
  }

  const isDocValid = VALIDATORS.isValidDocument(values.document)
  const isNameValid = VALIDATORS.isValidName(values.name)
  const isPhoneValid = !values.phone || VALIDATORS.isValidPhone(values.phone)
  const isEmailValid = values.email ? VALIDATORS.isValidEmail(values.email) : true

  const canSubmit =
    isDocValid && isNameValid && isPhoneValid && isEmailValid &&
    !docAsyncError && !emailAsyncError && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      await dispatch(
        createCustomerThunk({
          documentType: values.documentType,
          document: values.document,
          personType: values.personType,
          name: values.name.trim(),
          lastName: values.lastName.trim() || undefined,
          tradeName: values.tradeName.trim() || undefined,
          legalRepresentative: values.legalRepresentative.trim() || undefined,
          email: values.email.trim() || undefined,
          phone: values.phone.trim() || undefined,
          mobile: values.mobile.trim() || undefined,
          address: values.address.trim() || undefined,
          city: values.city.trim() || undefined,
          vatResponsible: values.vatResponsible,
          fiscalRespCodes: values.fiscalRespCodes,
          priceTier: values.priceTier,
          discountPercent: values.discountPercent,
          docsValidityMonths: values.docsValidityMonths,
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
    <form onSubmit={handleSubmit} className="drawer-form customer-form">
      <div className="drawer-form-body customer-form-body">
        {submitError && <div className="form-field-error-msg">{submitError}</div>}
        <CustomerFormFields
          values={values}
          onChange={handleFieldChange}
          disabled={isSubmitting}
          docAsyncError={docAsyncError}
          emailAsyncError={emailAsyncError}
          onDocChange={handleDocChange}
          onEmailChange={handleEmailChange}
          errors={{
            document: values.document && !isDocValid ? 'Mínimo 6 y máximo 15 dígitos' : undefined,
            name: values.name && !isNameValid ? 'Nombre o razón social inválida (3-60 caracteres)' : undefined,
            phone: values.phone && !isPhoneValid ? 'Teléfono inválido' : undefined,
            email: values.email && !isEmailValid ? 'Correo no válido' : undefined,
          }}
        />
      </div>

      <div className="drawer-form-footer customer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
        </button>
      </div>
    </form>
  )
}

export default CreateCustomerForm
