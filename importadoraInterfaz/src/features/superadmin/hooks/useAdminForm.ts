// useAdminForm · estado y envío del formulario de administrador (crear o editar): borrador, validación y guardado
// conecta con: AdminFormDrawer y sus secciones; despacha superadmin.thunks (saveAdminThunk), cierra el panel con navigation y lee las compañías (companies)
// ojo: al crear, la empresa por defecto es la primera de la lista; el correo no se puede cambiar al editar
import { useState } from 'react'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { useCompanies } from '@/features/companies'
import { initialDraft, toSaveInput, validateDraft } from '../helpers/superadmin.helpers'
import { saveAdminThunk } from '../thunks/superadmin.thunks'
import type { AdminDraft, AdminUser } from '../types/superadmin.types'

export const useAdminForm = (admin?: AdminUser) => {
  const dispatch = useAppDispatch()
  const { companies } = useCompanies(true)
  const [draft, setDraft] = useState<AdminDraft>(() => initialDraft(admin))
  const [saving, setSaving] = useState(false)
  const editing = Boolean(admin)

  // sin elección propia se usa la primera empresa de la lista
  const effective: AdminDraft = { ...draft, companyId: draft.companyId || String(companies[0]?.id ?? '') }
  const setField = <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => setDraft((prev) => ({ ...prev, [key]: value }))
  const setCompanyField = (key: keyof AdminDraft['company'], value: string) => setDraft((prev) => ({ ...prev, company: { ...prev.company, [key]: value } }))

  const submit = async () => {
    if (saving) return
    const problem = validateDraft(effective, editing)
    if (problem) return toast.error(problem)
    setSaving(true)
    const result = await dispatch(saveAdminThunk(toSaveInput(effective, admin?.id)))
    setSaving(false)
    if (saveAdminThunk.fulfilled.match(result)) dispatch(closeDrawerForm())
  }

  return { draft: effective, editing, companies, saving, setField, setCompanyField, cancel: () => dispatch(closeDrawerForm()), submit }
}
