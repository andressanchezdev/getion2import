// CompanyTab · ficha de la empresa (datos que usan facturas, cotizaciones y pedidos): se ve y se edita
// conecta con: SettingsScreen (pestaña «empresa») y useCompanyForm (datos, edición y guardado); no habla con el API
import { Icon } from '@/global/components/UI/atoms/Icon'
import buildingIcon from '@/assets/icons/building.svg?raw'
import React from 'react'
import { COMPANY_FIELDS } from '../constants/settings.constants'
import { useCompanyForm } from '../hooks/useCompanyForm'
import './CompanyTab.css'

export const CompanyTab: React.FC = () => {
  const form = useCompanyForm()
  return (
    <div className="company-tab-container">
      <div className="company-tab-header">
        <div>
          <h4 className="company-tab-title">Ficha Corporativa</h4>
          <p className="company-tab-subtitle">Información de la empresa utilizada en facturación, cotizaciones y pedidos.</p>
        </div>
        {!form.editing && form.company && (
          <button type="button" className="company-btn-edit" onClick={form.startEdit}><Icon svg={buildingIcon} /> Editar Información de Empresa</button>
        )}
      </div>

      {form.loading && !form.company && <p className="company-tab-subtitle">Cargando información de la empresa...</p>}

      {!form.editing && form.company && (
        <div className="company-details-grid">
          {COMPANY_FIELDS.map((field) => (
            <div className="company-info-card" key={field.key}>
              <span className="cic-label">{field.label}</span>
              <strong className="cic-value">{form.company?.[field.key] || '—'}</strong>
            </div>
          ))}
        </div>
      )}

      {form.editing && (
        <form onSubmit={(e) => { e.preventDefault(); form.save() }} className="company-edit-form">
          <div className="cef-row">
            {COMPANY_FIELDS.map((field) => (
              <div className="cef-group" key={field.key}>
                <label htmlFor={`comp-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
                <input
                  id={`comp-${field.key}`}
                  type={field.type}
                  inputMode={field.type === 'tel' ? 'tel' : undefined}
                  maxLength={field.type === 'tel' ? 10 : 120}
                  value={form.draft[field.key]}
                  onChange={(e) => form.setField(field.key, field.type === 'tel' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  required={field.required}
                />
              </div>
            ))}
          </div>
          <div className="cef-actions">
            <button type="button" className="cef-btn-cancel" onClick={form.cancel} disabled={form.saving}>Cancelar</button>
            <button type="submit" className="cef-btn-submit" disabled={form.saving}>
              {form.saving ? 'Guardando...' : 'Guardar Información de Empresa'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
export default CompanyTab
