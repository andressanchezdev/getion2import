import React, { useEffect, useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CreateCustomerForm.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { VALIDATORS } from '@/global/helpers/validation/validation.helpers'
import { useAsyncValidation } from '@/global/hooks/data/useAsyncValidation'
import { toast } from '@/global/helpers/feedback/toast'
import { useCustomerExists } from '../../hooks/useCustomerExists'
import { loadCustomerDetailThunk, loadCustomersThunk, updateCustomerThunk } from '../../thunks/customers.thunks'
import type { CustomerDetail } from '../../types/customers.types'
import { CustomerFormFields, type CustomerFormValues } from './CustomerFormFields'

interface EditCustomerFormProps {
  customerId: number
}

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

export const EditCustomerForm: React.FC<EditCustomerFormProps> = ({ customerId }) => {
  const dispatch = useAppDispatch()
  const [original, setOriginal] = useState<CustomerDetail | null>(null)
  const [values, setValues] = useState<CustomerFormValues>(INITIAL_VALUES)
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
        setValues({
          documentType: detail.documentType || 'CC',
          document: detail.identification || '',
          personType: (detail.personType as 'natural' | 'legal') || (detail.userType as 'natural' | 'legal') || 'natural',
          name: detail.name || detail.fullName || '',
          lastName: detail.lastName || '',
          tradeName: detail.tradeName || detail.businessName || '',
          legalRepresentative: detail.legalRepresentative || '',
          phone: detail.company?.phone ? String(detail.company.phone) : '',
          mobile: detail.mobile || (detail.company?.cellPhone ? String(detail.company.cellPhone) : ''),
          email: detail.email || '',
          city: detail.city || detail.company?.cityAndDepartment || '',
          address: detail.address || detail.company?.address || '',
          vatResponsible: Boolean(detail.vatResponsible),
          fiscalRespCodes: detail.fiscalRespCodes && detail.fiscalRespCodes.length > 0 ? detail.fiscalRespCodes : ['R-99-PN'],
          priceTier: detail.priceTier || 'p1',
          discountPercent: detail.discountPercent ?? 0,
          docsValidityMonths: detail.docsValidityMonths ?? 12,
        })
      })
      .catch((message) => !cancelled && setLoadError(typeof message === 'string' ? message : 'No se pudo cargar el cliente.'))
    return () => {
      cancelled = true
    }
  }, [dispatch, customerId])

  const handleFieldChange = <K extends keyof CustomerFormValues>(field: K, val: CustomerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: val }))
  }

  const handleEmailChange = (val: string) => {
    if (VALIDATORS.isValidEmail(val) && val.trim().toLowerCase() !== (original?.email ?? '').toLowerCase()) {
      validateEmailDebounced(val)
    }
  }

  const isNameValid = VALIDATORS.isValidName(values.name)
  const isPhoneValid = !values.phone || VALIDATORS.isValidPhone(values.phone)
  const isEmailValid = values.email ? VALIDATORS.isValidEmail(values.email) : true
  const canSubmit = Boolean(original) && isNameValid && isPhoneValid && isEmailValid && !emailAsyncError && !isSubmitting

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const body = {
        name: values.name.trim(),
        lastName: values.lastName.trim() || '',
        tradeName: values.tradeName.trim() || '',
        legalRepresentative: values.legalRepresentative.trim() || '',
        phone: values.phone.trim() || '',
        mobile: values.mobile.trim() || '',
        email: values.email.trim() || '',
        city: values.city.trim() || '',
        address: values.address.trim() || '',
        personType: values.personType,
        vatResponsible: values.vatResponsible,
        fiscalRespCodes: values.fiscalRespCodes,
        priceTier: values.priceTier,
        discountPercent: values.discountPercent,
        docsValidityMonths: values.docsValidityMonths,
      }

      await dispatch(updateCustomerThunk({ id: customerId, body })).unwrap()
      toast.success('Cliente actualizado correctamente')
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

  if (loadError) return <div className="drawer-form customer-form"><div className="drawer-form-body customer-form-body"><div className="form-field-error-msg">{loadError}</div></div></div>
  if (!original) return <div className="drawer-form customer-form"><div className="drawer-form-body customer-form-body">Cargando cliente…</div></div>

  return (
    <form onSubmit={handleSubmit} className="drawer-form customer-form">
      <div className="drawer-form-body customer-form-body">
        {submitError && <div className="form-field-error-msg">{submitError}</div>}
        <CustomerFormFields
          values={values}
          onChange={handleFieldChange}
          disabled={isSubmitting}
          isEdit
          emailAsyncError={emailAsyncError}
          onEmailChange={handleEmailChange}
          errors={{
            name: values.name && !isNameValid ? 'Nombre o razón social inválida (3-60 caracteres)' : undefined,
            phone: values.phone && !isPhoneValid ? 'Teléfono inválido' : undefined,
            email: values.email && !isEmailValid ? 'Correo no válido' : undefined,
          }}
        />
      </div>

      <div className="drawer-form-footer customer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export default EditCustomerForm
