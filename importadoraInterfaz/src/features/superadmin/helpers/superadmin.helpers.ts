// superadmin.helpers · funciones puras del formulario de administrador: borrador inicial, validación y cuerpo que se envía
// conecta con: useAdminForm (borrador, validación y envío); con pruebas en superadmin.helpers.test.ts
import { MIN_ADMIN_PASSWORD_LENGTH } from '../constants/superadmin.constants'
import type { AdminDraft, AdminUser, SaveAdminInput } from '../types/superadmin.types'

export const initialDraft = (admin?: AdminUser, firstCompanyId?: number): AdminDraft => ({
  firstName: admin?.firstName ?? '',
  lastName: admin?.lastName ?? '',
  email: admin?.email ?? '',
  password: '',
  documentType: admin?.documentType || 'CC',
  document: admin?.document ?? '',
  phone: admin?.phone ?? '',
  isActive: admin?.isActive !== false,
  companyMode: 'existing',
  companyId: admin?.companyId ? String(admin.companyId) : firstCompanyId ? String(firstCompanyId) : '',
  company: { name: '', phone: '', address: '', city: '' },
})

// devuelve el texto del problema, o null si el borrador se puede guardar
export const validateDraft = (draft: AdminDraft, editing: boolean): string | null => {
  if (!draft.firstName.trim()) return 'El nombre del administrador es obligatorio.'
  if (editing) return draft.password.trim() && draft.password.trim().length < MIN_ADMIN_PASSWORD_LENGTH ? `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.` : null
  if (!draft.email.trim()) return 'El correo electrónico es obligatorio.'
  if (draft.password.length < MIN_ADMIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`
  if (draft.companyMode === 'new' && !draft.company.name.trim()) return 'El nombre de la empresa es requerido para crearla.'
  if (draft.companyMode === 'existing' && !Number(draft.companyId)) return 'Debes seleccionar o crear una empresa.'
  return null
}

const optional = (value: string): string | undefined => value.trim() || undefined

// el cuerpo que se envía: editar un administrador, o crearlo con empresa existente o nueva
export const toSaveInput = (draft: AdminDraft, adminId?: number): SaveAdminInput => {
  if (adminId) {
    return {
      adminId,
      update: {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        documentType: draft.documentType,
        document: optional(draft.document),
        phone: optional(draft.phone),
        isActive: draft.isActive,
        password: optional(draft.password),
      },
    }
  }
  const create = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim().toLowerCase(),
    password: draft.password.trim(),
    documentType: draft.documentType,
    document: optional(draft.document),
    phone: optional(draft.phone),
  }
  if (draft.companyMode === 'new') {
    const { name, phone, address, city } = draft.company
    return { create, newCompany: { name: name.trim(), phone: optional(phone), address: optional(address), city: optional(city) } }
  }
  return { create, companyId: Number(draft.companyId) }
}
