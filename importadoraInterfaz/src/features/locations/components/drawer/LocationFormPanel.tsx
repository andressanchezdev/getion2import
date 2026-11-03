// LocationFormPanel · formulario en el panel derecho para crear o editar una ubicación (estante) de la bodega
// conecta con: useLocationForm (estado y guardado), DrawerFormShell.css (armazón) y navigation (cerrar el panel); lo abre formRegistry («locationForm»)
// ojo: renombrar una ubicación mueve también todo lo que hay guardado en ella (lo hace la API)
import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './LocationFormPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { useLocationForm } from '../../hooks/useLocationForm'
import type { WarehouseLocation } from '../../types/locations.types'

export interface LocationFormPayload {
  warehouseId: number
  warehouseName: string
  location?: WarehouseLocation // si llega, se edita; si no, se crea
}

const QUICK_PRESETS = [
  'EST-A-01',
  'EST-B-01',
  'PAS-01-N1',
  'PAS-02-N1',
  'MOD-A-01',
  'SEC-01',
  'BOD-A-01',
]

const PREFIXES = [
  { label: 'Estante (EST)', value: 'EST' },
  { label: 'Pasillo (PAS)', value: 'PAS' },
  { label: 'Módulo (MOD)', value: 'MOD' },
  { label: 'Nivel (NIV)', value: 'NIV' },
  { label: 'Sección (SEC)', value: 'SEC' },
  { label: 'Bodega (BOD)', value: 'BOD' },
]

const ZONES = ['A', 'B', 'C', 'D', 'E', 'F']
const NUMBERS = ['01', '02', '03', '04', '05', '10']

export const LocationFormPanel: React.FC<{ payload: LocationFormPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const form = useLocationForm(payload.warehouseId, payload.location)

  const [selectedPrefix, setSelectedPrefix] = useState('EST')
  const [selectedZone, setSelectedZone] = useState('A')
  const [selectedNum, setSelectedNum] = useState('01')

  const handleApplyPreset = (code: string) => {
    form.setCode(code)
  }

  const handleApplyCombination = (prefix: string, zone: string, num: string) => {
    setSelectedPrefix(prefix)
    setSelectedZone(zone)
    setSelectedNum(num)
    form.setCode(`${prefix}-${zone}-${num}`)
  }

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">Bodega: <strong>{payload.warehouseName || `#${payload.warehouseId}`}</strong></p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="location-code">
            Código de la ubicación
          </label>
          <input
            id="location-code"
            className="drawer-form-control"
            value={form.code}
            onChange={(e) => form.setCode(e.target.value.toUpperCase())}
            placeholder="Ej: EST-A-01"
            disabled={form.saving}
            autoFocus
            required
          />
          <span className="drawer-form-hint">Es lo que se imprime en el QR. Puedes elegir una opción rápida o construirla abajo y editarla a tu gusto.</span>
        </div>

        {/* Generador de combinaciones alfanuméricas rápidas */}
        <div className="location-code-generator">
          <div className="location-code-generator-title">
            <span>Opciones rápidas alfanuméricas</span>
          </div>

          <div className="location-quick-presets" role="group" aria-label="Sugerencias rápidas">
            {QUICK_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset}
                className={`location-preset-chip ${form.code === preset ? 'active' : ''}`}
                onClick={() => handleApplyPreset(preset)}
                disabled={form.saving}
                title="Hacer clic para usar y editar"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="location-builder-grid">
            <div className="location-builder-row">
              <span className="location-builder-label">Prefijo / Tipo:</span>
              <div className="location-builder-chips">
                {PREFIXES.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    className={`location-builder-chip ${selectedPrefix === p.value ? 'selected' : ''}`}
                    onClick={() => handleApplyCombination(p.value, selectedZone, selectedNum)}
                    disabled={form.saving}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="location-builder-row">
              <span className="location-builder-label">Zona / Letra:</span>
              <div className="location-builder-chips">
                {ZONES.map((z) => (
                  <button
                    type="button"
                    key={z}
                    className={`location-builder-chip ${selectedZone === z ? 'selected' : ''}`}
                    onClick={() => handleApplyCombination(selectedPrefix, z, selectedNum)}
                    disabled={form.saving}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            <div className="location-builder-row">
              <span className="location-builder-label">Número / Nivel:</span>
              <div className="location-builder-chips">
                {NUMBERS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`location-builder-chip ${selectedNum === n ? 'selected' : ''}`}
                    onClick={() => handleApplyCombination(selectedPrefix, selectedZone, n)}
                    disabled={form.saving}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
