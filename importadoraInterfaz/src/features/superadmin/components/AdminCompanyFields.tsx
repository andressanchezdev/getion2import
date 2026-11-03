// AdminCompanyFields · sección «Empresa asociada» del formulario de administrador: elegir una empresa existente o registrar una nueva
// conecta con: AdminFormDrawer; valores y cambios vienen de useAdminForm
// ojo: la empresa nueva pide nombre, ciudad, teléfono y dirección (el backend no guarda NIT)
import React from 'react'
import type { AdminDraft } from '../types/superadmin.types'

interface Props {
  draft: AdminDraft
  companies: Array<{ id: number | string; name: string }>
  setField: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void
  setCompanyField: (key: keyof AdminDraft['company'], value: string) => void
}

const NEW_COMPANY_FIELDS: Array<{ key: keyof AdminDraft['company']; label: string; placeholder: string; required?: boolean }> = [
  { key: 'name', label: 'Razón Social / Nombre *', placeholder: 'Ej. Distribuidora del Norte SAS', required: true },
  { key: 'city', label: 'Ciudad', placeholder: 'Ej. Bogotá' },
  { key: 'phone', label: 'Teléfono', placeholder: '601 234 5678' },
  { key: 'address', label: 'Dirección', placeholder: 'Calle 10 # 20-30' },
]

export const AdminCompanyFields: React.FC<Props> = ({ draft, companies, setField, setCompanyField }) => (
  <fieldset className="drawer-form-fieldset">
    <legend className="drawer-form-legend">Empresa Asociada</legend>
    <div className="admin-form-company-toggle">
      <label className="admin-form-radio">
        <input type="radio" name="companyMode" checked={draft.companyMode === 'existing'} onChange={() => setField('companyMode', 'existing')} />
        Asignar a empresa existente
      </label>
      <label className="admin-form-radio">
        <input type="radio" name="companyMode" checked={draft.companyMode === 'new'} onChange={() => setField('companyMode', 'new')} />
        + Registrar nueva empresa
      </label>
    </div>

    {draft.companyMode === 'existing' ? (
      <div className="drawer-form-field">
        <label className="drawer-form-label" htmlFor="company-select">Seleccionar Empresa *</label>
        <select id="company-select" className="drawer-form-control" value={draft.companyId} onChange={(e) => setField('companyId', e.target.value)} required>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
        </select>
      </div>
    ) : (
      <div className="admin-new-company-fields">
        {NEW_COMPANY_FIELDS.map((field) => (
          <div className="drawer-form-field" key={field.key}>
            <label className="drawer-form-label" htmlFor={`new-comp-${field.key}`}>{field.label}</label>
            <input
              id={`new-comp-${field.key}`}
              type="text"
              className="drawer-form-control"
              placeholder={field.placeholder}
              value={draft.company[field.key]}
              onChange={(e) => setCompanyField(field.key, e.target.value)}
              required={field.required}
            />
          </div>
        ))}
      </div>
    )}
  </fieldset>
)
