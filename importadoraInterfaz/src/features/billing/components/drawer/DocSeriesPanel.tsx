// DocSeriesPanel · formulario en el panel derecho de una serie de consecutivos: prefijo y próximo número, con la vista de cómo saldrá el siguiente
// conecta con: useDocSeriesForm (estado, validación y guardado), billing.constants (nombre de la serie) y DrawerFormShell.css (armazón); lo abre formRegistry («docSeriesForm»)
// ojo: bajar el próximo número puede repetir consecutivos que ya se usaron: se avisa antes de guardar
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { DOC_SERIES_LABELS } from '../../constants/billing.constants'
import { useDocSeriesForm } from '../../hooks/useDocSeriesForm'
import type { DocSeries } from '../../types/billing.types'

export const DocSeriesPanel: React.FC<{ payload: DocSeries }> = ({ payload }) => {
  const form = useDocSeriesForm(payload)

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">Serie de <strong>{DOC_SERIES_LABELS[payload.docType] ?? payload.docType}</strong>. El siguiente que se emita saldrá como <strong>{form.preview}</strong>.</p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}
        {form.goesBack && <div className="form-field-error-msg">Estás bajando el próximo número: puede repetir consecutivos que ya se usaron.</div>}

        <div className="drawer-form-grid">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="series-prefix">Prefijo *</label>
            <input id="series-prefix" className="drawer-form-control" value={form.prefix} onChange={(e) => form.setPrefix(e.target.value)} placeholder="Ej: FE-" disabled={form.saving} autoFocus />
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="series-next">Próximo número *</label>
            <input id="series-next" className="drawer-form-control" type="number" min={1} step={1} value={form.next} onChange={(e) => form.setNext(e.target.value)} disabled={form.saving} />
          </div>
        </div>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || form.saving} title={form.problem ?? undefined}>
          {form.saving ? 'Guardando…' : 'Guardar serie'}
        </button>
      </div>
    </form>
  )
}

export default DocSeriesPanel
