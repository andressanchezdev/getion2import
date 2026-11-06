// BillingConfigPanel · formulario en el panel derecho de los datos fiscales de la bodega: quién factura, resolución de la DIAN, rango autorizado y retenciones
// conecta con: useBillingConfigForm (estado, validación y guardado) y DrawerFormShell.css (armazón); lo abre formRegistry («billingConfig»)
// ojo: NIT y razón social son obligatorios; el rango final no puede ser menor al inicial; el prefijo y el rango se usan al emitir las facturas de esa bodega
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { useBillingConfigForm, type BillingFormValues } from '../../hooks/useBillingConfigForm'
import type { FiscalDocumentType, TypeFacturation } from '../../types/billing.types'

export const BillingConfigPanel: React.FC = () => {
  const form = useBillingConfigForm()
  const { values, set, saving } = form

  const text = (field: keyof BillingFormValues, label: string, placeholder = '', type = 'text', required = false) => (
    <div className="drawer-form-field">
      <label className="drawer-form-label" htmlFor={`billing-${field}`}>{label}{required ? ' *' : ''}</label>
      <input id={`billing-${field}`} className="drawer-form-control" type={type} value={String(values[field])} onChange={(e) => set(field, e.target.value as never)} placeholder={placeholder} disabled={saving} />
    </div>
  )
  const check = (field: 'vatWithholder' | 'incomeWithholder' | 'selfWithholder', label: string) => (
    <label className="drawer-form-check">
      <input type="checkbox" checked={values[field]} onChange={(e) => set(field, e.target.checked)} disabled={saving} /> {label}
    </label>
  )

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        {!form.hasConfig && <div className="drawer-form-note">Esta bodega todavía no tiene datos fiscales: sin ellos no se pueden emitir facturas.</div>}
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section">
          <div className="drawer-form-grid">
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="billing-type">Tipo de facturación</label>
              <select id="billing-type" className="drawer-form-control" value={values.typeFacturation} onChange={(e) => set('typeFacturation', e.target.value as TypeFacturation)} disabled={saving}>
                <option value="juridica">Persona jurídica</option>
                <option value="natural">Persona natural</option>
              </select>
            </div>
            <div className="drawer-form-field">
              <label className="drawer-form-label" htmlFor="billing-doctype">Tipo de documento</label>
              <select id="billing-doctype" className="drawer-form-control" value={values.documentType} onChange={(e) => set('documentType', e.target.value as FiscalDocumentType)} disabled={saving}>
                <option value="NIT">NIT</option>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
              </select>
            </div>
          </div>
          {text('nit', 'NIT o documento', 'Ej: 900111222-1', 'text', true)}
          {form.nitProblem && <span className="form-field-error-msg">{form.nitProblem}</span>}
          {text('legalName', 'Razón social', 'Ej: Importadora Premium S.A.S.', 'text', true)}
          {text('tradeName', 'Nombre comercial')}
        </section>

        <section className="drawer-form-section">
          <div className="drawer-form-grid">
            {text('billingEmail', 'Correo de facturación', '', 'email')}
            {text('billingPhone', 'Teléfono')}
          </div>
          <div className="drawer-form-grid">
            {text('billingAddress', 'Dirección')}
            {text('billingCity', 'Ciudad')}
          </div>
        </section>

        <section className="drawer-form-section">
          <div className="drawer-form-grid">
            {text('invoicePrefix', 'Prefijo de factura', 'Ej: FE')}
            {text('resolutionNumber', 'Número de resolución')}
          </div>
          {text('resolutionDate', 'Fecha de la resolución', '', 'date')}
          {text('resolutionValidUntil', 'Vigente hasta', '', 'date')}
          <div className="drawer-form-grid">
            {text('rangeFrom', 'Rango desde', '1', 'number')}
            {text('rangeTo', 'Rango hasta', '5000', 'number')}
          </div>
          <div className="drawer-form-note">Cambiar la resolución no reinicia el consecutivo. Verifica que el próximo número siga dentro del rango autorizado. Si la resolución vence o se agota el rango, se alertará sin bloquear la facturación.</div>
        </section>

        <section className="drawer-form-section">
          {check('vatWithholder', 'Retenedor de IVA')}
          {check('incomeWithholder', 'Retenedor de renta')}
          {check('selfWithholder', 'Autorretenedor')}
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || saving} title={form.problem ?? undefined}>
          {saving ? 'Guardando…' : 'Guardar datos fiscales'}
        </button>
      </div>
    </form>
  )
}

export default BillingConfigPanel
