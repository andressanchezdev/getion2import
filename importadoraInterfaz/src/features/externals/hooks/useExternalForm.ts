// useExternalForm · estado y guardado del formulario de un proveedor o transportadora (crear o editar)
// conecta con: ExternalFormPanel (lo usa), externals.thunks (saveExternalThunk), externals.constants (textos) y navigation (cierra el panel)
// ojo: los campos vacíos no se mandan; el nombre es lo único obligatorio; los plazos y cupos solo se piden a proveedores
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { emailProblem, integerProblem, phoneProblem } from '@/global/helpers/validation/validation.helpers'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { labelsOf } from '../constants/externals.constants'
import { selectExternalsSaving } from '../selectors/externals.selectors'
import { saveExternalThunk } from '../thunks/externals.thunks'
import type { CreateExternalPayload, DocumentType, ExternalEntity, ExternalKind } from '../types/externals.types'

export interface ExternalFormValues {
  name: string
  documentType: DocumentType
  document: string
  category: string
  phone: string
  email: string
  contactName: string
  contactPhone: string
  city: string
  address: string
  coverage: string
  termsDays: string
  creditLimit: string
  isActive: boolean
}

const valuesOf = (item?: ExternalEntity): ExternalFormValues => ({
  name: item?.name ?? '',
  documentType: item?.documentType ?? 'NIT',
  document: item?.document ?? '',
  category: item?.category ?? '',
  phone: item?.phone ?? '',
  email: item?.email ?? '',
  contactName: item?.contactName ?? '',
  contactPhone: item?.contactPhone ?? '',
  city: item?.city ?? '',
  address: item?.address ?? '',
  coverage: item?.coverage ?? '',
  termsDays: String(item?.termsDays ?? 0),
  creditLimit: String(item?.creditLimit ?? 0),
  isActive: item?.isActive !== false,
})

const clean = (text: string) => text.trim() || undefined

export const useExternalForm = (kind: ExternalKind, item?: ExternalEntity) => {
  const dispatch = useAppDispatch()
  const saving = useAppSelector(selectExternalsSaving)
  const [values, setValues] = useState<ExternalFormValues>(() => valuesOf(item))
  const [error, setError] = useState<string | null>(null)
  const labels = labelsOf(kind)

  const set = <K extends keyof ExternalFormValues>(field: K, value: ExternalFormValues[K]) => setValues((prev) => ({ ...prev, [field]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    const problem =
      (!values.name.trim() ? 'El nombre o razón social es obligatorio.' : null) ??
      phoneProblem(values.phone) ??
      phoneProblem(values.contactPhone) ??
      emailProblem(values.email) ??
      (kind === 'carrier' ? null : integerProblem(values.termsDays, 'Los días de plazo', 0, 365))
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    const payload: CreateExternalPayload = {
      kind,
      name: values.name.trim(),
      documentType: values.documentType,
      document: clean(values.document),
      category: clean(values.category),
      phone: clean(values.phone),
      email: clean(values.email),
      contactName: clean(values.contactName),
      contactPhone: clean(values.contactPhone),
      city: clean(values.city),
      address: clean(values.address),
      coverage: kind === 'carrier' ? clean(values.coverage) : undefined,
      termsDays: kind === 'carrier' ? undefined : Number(values.termsDays) || 0,
      creditLimit: kind === 'carrier' ? undefined : Number(values.creditLimit) || 0,
      isActive: values.isActive,
    }
    const result = await dispatch(saveExternalThunk({ id: item?.id, payload }))
    if (saveExternalThunk.fulfilled.match(result)) {
      toast.success(`${labels.singular} ${item ? 'actualizado' : 'registrado'}`)
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo guardar el registro.')
    }
  }

  return { values, set, error, saving, isEdit: Boolean(item), labels, isCarrier: kind === 'carrier', submit, cancel: () => dispatch(closeDrawerForm()) }
}
