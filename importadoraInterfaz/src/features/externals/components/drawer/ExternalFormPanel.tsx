// ExternalFormPanel · formulario en el panel derecho para registrar o editar un proveedor o una transportadora
// conecta con: useExternalForm (estado y guardado), DrawerFormShell.css (armazón) y externals.constants; lo abre formRegistry («externalForm»)
// ojo: las condiciones de crédito solo aparecen en proveedores y la cobertura solo en transportadoras
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { SANITIZERS } from '@/global/helpers/validation/validation.helpers'
import { useExternalForm, type ExternalFormValues } from '../../hooks/useExternalForm'
import type { DocumentType, ExternalEntity, ExternalKind } from '../../types/externals.types'

export interface ExternalFormPayload {
  kind: ExternalKind
  item?: ExternalEntity // si llega, se edita; si no, se registra
}

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: 'NIT', label: 'NIT (empresas)' },
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

export const ExternalFormPanel: React.FC<{ payload: ExternalFormPayload }> = ({ payload }) => {
  const form = useExternalForm(payload.kind, payload.item)
  const { values, set, saving } = form

  // type «tel» deja solo dígitos (máx. 10, como un teléfono colombiano); «number» es para enteros como los días de plazo
  const text = (field: keyof ExternalFormValues, label: string, placeholder: string, type = 'text') => (
    <div className="drawer-form-field">
      <label className="drawer-form-label" htmlFor={`external-${field}`}>{label}</label>
      <input
        id={`external-${field}`}
        className="drawer-form-control"
        type={type}
        min={type === 'number' ? 0 : undefined}
        max={type === 'number' ? 365 : undefined}
        step={type === 'number' ? 1 : undefined}
        inputMode={type === 'tel' ? 'tel' : type === 'number' ? 'numeric' : undefined}
        maxLength={type === 'tel' ? 10 : 120}
        value={String(values[field])}
        onChange={(e) => set(field, (type === 'tel' ? SANITIZERS.phoneCO(e.target.value) : e.target.value) as never)}
        placeholder={placeholder}
        disabled={saving}
      />
    </div>
  )

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="external-name">Razón social / nombre *</label>
            <input id="external-name" className="drawer-form-control" value={values.name} maxLength={120} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Repuestos y Accesorios S.A.S." disabled={saving} autoFocus required />
          </div>
          <div className="drawer-form-grid">
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="external-documentType">Tipo de documento</label>
              <select id="external-documentType" className="drawer-form-control" value={values.documentType} onChange={(e) => set('documentType', e.target.value as DocumentType)} disabled={saving}>
                {DOCUMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {text('document', 'Número', 'Ej: 900123456-7')}
          </div>
          {text('category', 'Categoría o rubro', form.isCarrier ? 'Ej: Terrestre, carga pesada' : 'Ej: Frenos, motores')}
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="external-isActive">Estado</label>
            <select id="external-isActive" className="drawer-form-control" value={values.isActive ? 'active' : 'inactive'} onChange={(e) => set('isActive', e.target.value === 'active')} disabled={saving}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </section>

        <section className="drawer-form-section">
          <div className="drawer-form-grid">
            {text('phone', 'Teléfono', 'Ej: 3120001122', 'tel')}
            {text('email', 'Correo', 'contacto@empresa.com', 'email')}
          </div>
          <div className="drawer-form-grid">
            {text('contactName', 'Persona de contacto', 'Ej: Carlos Restrepo')}
            {text('contactPhone', 'Teléfono del contacto', 'Ej: 3158889900', 'tel')}
          </div>
          <div className="drawer-form-grid">
            {text('city', 'Ciudad', 'Ej: Cali')}
            {text('address', 'Dirección', 'Ej: Calle 10 # 15-20')}
          </div>
          {form.isCarrier && text('coverage', 'Cobertura de envíos', 'Ej: Nacional, regional suroccidente')}
        </section>

        {!form.isCarrier && (
          <section className="drawer-form-section">
            <div className="drawer-form-grid">
              {text('termsDays', 'Días de plazo de pago', '30', 'number')}
              <div className="drawer-form-field">
                <label className="drawer-form-label" htmlFor="external-creditLimit">Cupo de crédito ($)</label>
                <MoneyInput id="external-creditLimit" className="drawer-form-control" value={values.creditLimit === '0' ? '' : values.creditLimit} onValueChange={(digits) => set('creditLimit', digits || '0')} placeholder="Ej: 5.000.000" disabled={saving} />
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : form.isEdit ? 'Guardar cambios' : `Registrar ${form.labels.singular.toLowerCase()}`}
        </button>
      </div>
    </form>
  )
}

export default ExternalFormPanel
