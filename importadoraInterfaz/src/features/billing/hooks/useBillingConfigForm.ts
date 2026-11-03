// useBillingConfigForm · formulario de los datos fiscales de la bodega activa: quién factura, resolución, rango y retenciones
// conecta con: BillingConfigPanel (lo usa), billing.rules (validación), billing.thunks (saveBillingConfigThunk), billing.selectors y navigation (cierra el panel)
// ojo: NIT y razón social son obligatorios y el rango final no puede ser menor al inicial; los números vacíos no se envían; el API valida otra vez
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { billingProblem } from '../helpers/billing.rules'
import { selectBilling } from '../selectors/billing.selectors'
import { saveBillingConfigThunk } from '../thunks/billing.thunks'
import type { BillingConfigInput, FiscalDocumentType, TypeFacturation } from '../types/billing.types'

export interface BillingFormValues {
  typeFacturation: TypeFacturation
  documentType: FiscalDocumentType
  nit: string
  legalName: string
  tradeName: string
  billingEmail: string
  billingPhone: string
  billingAddress: string
  billingCity: string
  invoicePrefix: string
  resolutionNumber: string
  resolutionDate: string
  rangeFrom: string
  rangeTo: string
  vatWithholder: boolean
  incomeWithholder: boolean
  selfWithholder: boolean
}

const numberOf = (text: string): number | undefined => (text.trim() === '' ? undefined : Number(text))

export const useBillingConfigForm = () => {
  const dispatch = useAppDispatch()
  const warehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const { config, saving } = useAppSelector(selectBilling)
  const [values, setValues] = useState<BillingFormValues>(() => ({
    typeFacturation: config?.typeFacturation ?? 'juridica',
    documentType: config?.documentType ?? 'NIT',
    nit: config?.nit ?? '',
    legalName: config?.legalName ?? '',
    tradeName: config?.tradeName ?? '',
    billingEmail: config?.billingEmail ?? '',
    billingPhone: config?.billingPhone ?? '',
    billingAddress: config?.billingAddress ?? '',
    billingCity: config?.billingCity ?? '',
    invoicePrefix: config?.invoicePrefix ?? '',
    resolutionNumber: config?.resolutionNumber ?? '',
    resolutionDate: config?.resolutionDate ?? '',
    rangeFrom: config?.rangeFrom !== null && config?.rangeFrom !== undefined ? String(config.rangeFrom) : '',
    rangeTo: config?.rangeTo !== null && config?.rangeTo !== undefined ? String(config.rangeTo) : '',
    vatWithholder: config?.vatWithholder ?? false,
    incomeWithholder: config?.incomeWithholder ?? false,
    selfWithholder: config?.selfWithholder ?? false,
  }))
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof BillingFormValues>(field: K, value: BillingFormValues[K]) => setValues((prev) => ({ ...prev, [field]: value }))

  const toInput = (): BillingConfigInput => ({
    typeFacturation: values.typeFacturation,
    documentType: values.documentType,
    nit: values.nit.trim(),
    legalName: values.legalName.trim(),
    tradeName: values.tradeName.trim(),
    billingEmail: values.billingEmail.trim(),
    billingPhone: values.billingPhone.trim(),
    billingAddress: values.billingAddress.trim(),
    billingCity: values.billingCity.trim(),
    invoicePrefix: values.invoicePrefix.trim(),
    resolutionNumber: values.resolutionNumber.trim(),
    ...(values.resolutionDate ? { resolutionDate: values.resolutionDate } : {}),
    ...(numberOf(values.rangeFrom) !== undefined ? { rangeFrom: numberOf(values.rangeFrom) } : {}),
    ...(numberOf(values.rangeTo) !== undefined ? { rangeTo: numberOf(values.rangeTo) } : {}),
    vatWithholder: values.vatWithholder,
    incomeWithholder: values.incomeWithholder,
    selfWithholder: values.selfWithholder,
  })

  const input = toInput()
  const problem = warehouseId <= 0 ? 'Elige una bodega' : billingProblem(input)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (problem || saving) return
    setError(null)
    const result = await dispatch(saveBillingConfigThunk({ warehouseId, input }))
    if (saveBillingConfigThunk.fulfilled.match(result)) {
      toast.success('Datos fiscales guardados')
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudieron guardar los datos fiscales.')
    }
  }

  return { values, set, problem, saving, error, submit, hasConfig: config !== null, cancel: () => dispatch(closeDrawerForm()) }
}
