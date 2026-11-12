// SpecialActionsSelector · casillas de las acciones especiales (avanzar etapa, facturar, reubicar, conteos…) debajo de la matriz de pantallas
// conecta con: EmployeePermissionsPanel (borrador specials de useEmployeePermissions), SPECIAL_ACTIONS (lista y grupos) y PermissionsSelector.css (mismo acordeón)
// ojo: cada casilla es una llave «modulo:accion» de la API; sin ella el botón se oculta en la interfaz y la ruta responde 403
import React, { useState } from 'react'
import { SPECIAL_ACTIONS } from '../../constants/employees.permissions.constants'
import './PermissionsSelector.css'

interface SpecialActionsSelectorProps {
  value: string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
}

// los grupos en el orden en que aparecen en SPECIAL_ACTIONS
const GROUPS = [...new Set(SPECIAL_ACTIONS.map((action) => action.group))]

export const SpecialActionsSelector: React.FC<SpecialActionsSelectorProps> = ({ value, onChange, readOnly = false }) => {
  const [open, setOpen] = useState(false)
  const owned = new Set(value)
  const toggle = (key: string) => onChange(owned.has(key) ? value.filter((k) => k !== key) : [...value, key])

  return (
    <div className="permissions-accordion-list">
      <div className={`perm-accordion-item ${open ? 'is-open' : ''}`}>
        <div className="perm-accordion-header" onClick={() => setOpen((curr) => !curr)}>
          <div className="perm-accordion-title">
            <span className="perm-chevron">{open ? '▾' : '▸'}</span>
            <strong>Acciones especiales</strong>
            <span className="perm-count">({value.length} de {SPECIAL_ACTIONS.length})</span>
          </div>
        </div>

        {open && (
          <div className="perm-accordion-body">
            {GROUPS.map((group) => (
              <div key={group} className="perm-screen-row">
                <span className="perm-screen-label">{group}</span>
                <div className="perm-screen-checkboxes">
                  {SPECIAL_ACTIONS.filter((action) => action.group === group).map((action) => {
                    const isChecked = owned.has(action.key)
                    return (
                      <label key={action.key} className={`perm-checkbox-label ${isChecked ? 'is-checked' : ''}`}>
                        <input type="checkbox" checked={isChecked} disabled={readOnly} onChange={() => toggle(action.key)} />
                        <span>{action.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SpecialActionsSelector
