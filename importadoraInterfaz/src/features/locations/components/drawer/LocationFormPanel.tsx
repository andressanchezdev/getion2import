// LocationFormPanel · formulario en el panel derecho para crear o editar una ubicación (estante) de la bodega
// conecta con: useLocationForm (estado y guardado), DrawerFormShell.css (armazón) y navigation (cerrar el panel); lo abre formRegistry («locationForm»)
// ojo: renombrar una ubicación mueve también todo lo que hay guardado en ella (lo hace la API)
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useLocationForm } from '../../hooks/useLocationForm'
import type { WarehouseLocation } from '../../types/locations.types'

export interface LocationFormPayload {
  warehouseId: number
  warehouseName: string
  location?: WarehouseLocation // si llega, se edita; si no, se crea
}

export const LocationFormPanel: React.FC<{ payload: LocationFormPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const form = useLocationForm(payload.warehouseId, payload.location)

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">Bodega: <strong>{payload.warehouseName || `#${payload.warehouseId}`}</strong></p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="location-code">
            Código de la ubicación
          </label>
          <input id="location-code" className="drawer-form-control" value={form.code} onChange={(e) => form.setCode(e.target.value)} placeholder="Ej: ESTANTE-A-03" disabled={form.saving} autoFocus required />
          <span className="drawer-form-hint">Es lo que se imprime en el QR. Si lo cambias, los productos guardados aquí pasan al código nuevo.</span>
        </div>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="location-description">
            Descripción (opcional)
          </label>
          <input id="location-description" className="drawer-form-control" value={form.description} onChange={(e) => form.setDescription(e.target.value)} placeholder="Ej: Pasillo 2, nivel 3, frenos" disabled={form.saving} />
        </div>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={form.saving}>
          {form.saving ? 'Guardando…' : form.isEdit ? 'Guardar cambios' : 'Crear ubicación'}
        </button>
      </div>
    </form>
  )
}

export default LocationFormPanel
