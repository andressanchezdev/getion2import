// PermissionsSelector · selector de permisos en acordeón simple por módulo para panel de 400px
import React, { useState } from 'react'
import type { NavItem } from '@/features/navigation'
import {
  countScreens,
  emptyModule,
  flagsForScreen,
  isScreenOn,
  setAllModules,
  setModule,
  toggleScreenFlag,
  type PermissionFlag,
  type PermissionsMap,
} from '../../helpers/permissions.selection'
import './PermissionsSelector.css'

interface PermissionsSelectorProps {
  items: NavItem[]
  value: PermissionsMap
  onChange: (next: PermissionsMap) => void
  readOnly?: boolean
}

export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({ items, value, onChange, readOnly = false }) => {
  const { selected, total } = countScreens(value, items)
  const [openModuleId, setOpenModuleId] = useState<string | null>(items[0]?.id ?? null)

  const toggleAccordion = (id: string) => {
    setOpenModuleId((curr) => (curr === id ? null : id))
  }

  const handleFlagChange = (moduleId: string, screenKey: string, flag: PermissionFlag) => {
    const currentMod = value[moduleId] ?? emptyModule(items.find((i) => i.id === moduleId)!)
    const nextMod = toggleScreenFlag(currentMod, screenKey, flag)
    onChange({ ...value, [moduleId]: nextMod })
  }

  return (
    <div className="permissions-selector">
      <div className="permissions-summary">
        <span>
          Pantallas activas: <strong>{selected}</strong> de {total}
        </span>
        {!readOnly && (
          <div className="permissions-summary-actions">
            <button type="button" className="btn-secondary" onClick={() => onChange(setAllModules(value, items, true))}>
              Todas
            </button>
            <button type="button" className="btn-secondary" onClick={() => onChange(setAllModules(value, items, false))}>
              Ninguna
            </button>
          </div>
        )}
      </div>

      <div className="permissions-accordion-list">
        {items.map((item) => {
          const modPerm = value[item.id] ?? emptyModule(item)
          const isOpen = openModuleId === item.id
          const activeCount = item.subitems.filter((sub) => isScreenOn(modPerm, sub.id)).length
          const totalSubs = item.subitems.length

          return (
            <div key={item.id} className={`perm-accordion-item ${isOpen ? 'is-open' : ''}`}>
              <div className="perm-accordion-header" onClick={() => toggleAccordion(item.id)}>
                <div className="perm-accordion-title">
                  <span className="perm-chevron">{isOpen ? '▾' : '▸'}</span>
                  <strong>{item.label}</strong>
                  <span className="perm-count">({activeCount} de {totalSubs})</span>
                </div>
                {!readOnly && (
                  <div className="perm-header-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="perm-link-btn"
                      onClick={() => onChange({ ...value, [item.id]: setModule(modPerm, item, true) })}
                    >
                      Todos
                    </button>
                    <span className="perm-link-sep">·</span>
                    <button
                      type="button"
                      className="perm-link-btn"
                      onClick={() => onChange({ ...value, [item.id]: setModule(modPerm, item, false) })}
                    >
                      Ninguno
                    </button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className="perm-accordion-body">
                  {item.subitems.map((sub) => {
                    const screenPerm = modPerm.screens?.find((s) => s.screenKey === sub.id)
                    const availableFlags = flagsForScreen(sub.id)

                    return (
                      <div key={sub.id} className="perm-screen-row">
                        <span className="perm-screen-label">{sub.label}</span>
                        <div className="perm-screen-checkboxes">
                          {availableFlags.map((flag) => {
                            const isChecked = Boolean(screenPerm?.[flag.key])
                            return (
                              <label key={flag.key} className={`perm-checkbox-label ${isChecked ? 'is-checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={readOnly}
                                  onChange={() => handleFlagChange(item.id, sub.id, flag.key)}
                                />
                                <span>{flag.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PermissionsSelector
