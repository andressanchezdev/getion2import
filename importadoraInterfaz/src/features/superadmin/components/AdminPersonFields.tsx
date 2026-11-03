// AdminPersonFields · sección «Datos personales y acceso» del formulario de administrador: nombre, correo, clave, documento, teléfono y estado
// conecta con: AdminFormDrawer; valores y cambios vienen de useAdminForm
// ojo: al editar el correo queda bloqueado, la clave es opcional (vacía = no se cambia) y aparece el estado activo / inactivo
import React from 'react'
import { DOCUMENT_TYPES, MIN_ADMIN_PASSWORD_LENGTH } from '../constants/superadmin.constants'
import type { AdminDraft } from '../types/superadmin.types'

interface Props {
  draft: AdminDraft
  editing: boolean
  setField: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minLength?: number
}

const Field: React.FC<FieldProps> = ({ id, label, value, onChange, type = 'text', ...rest }) => (
  <div className="drawer-form-field">
    <label className="drawer-form-label" htmlFor={id}>{label}</label>
    <input id={id} type={type} className="drawer-form-control" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
  </div>
)

export const AdminPersonFields: React.FC<Props> = ({ draft, editing, setField }) => (
  <fieldset className="drawer-form-fieldset">
    <legend className="drawer-form-legend">Datos Personales y Acceso</legend>
    <div className="drawer-form-row">
      <Field id="admin-fname" label="Nombre *" placeholder="Nombre" value={draft.firstName} onChange={(v) => setField('firstName', v)} required />
      <Field id="admin-lname" label="Apellido" placeholder="Apellido" value={draft.lastName} onChange={(v) => setField('lastName', v)} />
    </div>
    <Field id="admin-email" label="Correo Electrónico (Usuario de acceso) *" type="email" placeholder="admin@empresa.com" value={draft.email} onChange={(v) => setField('email', v)} disabled={editing} required />
    <Field
      id="admin-password"
      label={editing ? 'Nueva Contraseña (dejar vacía para no cambiarla)' : `Contraseña inicial * (mín. ${MIN_ADMIN_PASSWORD_LENGTH} caracteres)`}
      type="password" placeholder="••••••••" value={draft.password} onChange={(v) => setField('password', v)} required={!editing} minLength={editing ? undefined : MIN_ADMIN_PASSWORD_LENGTH}
    />
    <div className="drawer-form-row">
      <div className="drawer-form-field">
        <label className="drawer-form-label" htmlFor="admin-doctype">Tipo de Documento</label>
        <select id="admin-doctype" className="drawer-form-control" value={draft.documentType} onChange={(e) => setField('documentType', e.target.value)}>
          {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <Field id="admin-docnum" label="Número de Documento" placeholder="1020304050" value={draft.document} onChange={(v) => setField('document', v)} />
    </div>
    <Field id="admin-phone" label="Teléfono / Celular" placeholder="310 987 6543" value={draft.phone} onChange={(v) => setField('phone', v)} />
    {editing && (
      <div className="drawer-form-field">
        <label className="drawer-form-label" htmlFor="admin-active-status">Estado del Administrador</label>
        <select id="admin-active-status" className="drawer-form-control" value={draft.isActive ? 'active' : 'inactive'} onChange={(e) => setField('isActive', e.target.value === 'active')}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
    )}
  </fieldset>
)
