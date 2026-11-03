// useCompanyForm · carga la ficha de la empresa y maneja el modo edición (borrador, cancelar y guardar)
// conecta con: CompanyTab; despacha settings.thunks y lee settings.slice
// ojo: el borrador se copia de la ficha al pulsar «Editar» (no en un efecto); si el guardado falla se queda en edición para no perder lo escrito
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCompany, selectSettings } from '../selectors/settings.selectors'
import { loadCompanyThunk, saveCompanyThunk } from '../thunks/settings.thunks'
import type { CompanyInput } from '../types/settings.types'

const EMPTY_DRAFT: CompanyInput = { name: '', email: '', phone: '', address: '', city: '' }

export const useCompanyForm = () => {
  const dispatch = useAppDispatch()
  const company = useAppSelector(selectCompany)
  const { companyLoading, companySaving } = useAppSelector(selectSettings)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CompanyInput>(EMPTY_DRAFT)

  useEffect(() => {
    dispatch(loadCompanyThunk())
  }, [dispatch])

  const startEdit = () => {
    setDraft(company ? { name: company.name, email: company.email, phone: company.phone, address: company.address, city: company.city } : EMPTY_DRAFT)
    setEditing(true)
  }
  const setField = (key: keyof CompanyInput, value: string) => setDraft((prev) => ({ ...prev, [key]: value }))
  const save = async () => {
    const result = await dispatch(saveCompanyThunk(draft))
    if (saveCompanyThunk.fulfilled.match(result)) setEditing(false)
  }

  return { company, loading: companyLoading, saving: companySaving, editing, draft, startEdit, cancel: () => setEditing(false), setField, save }
}
