// PermissionsSelector · selector visual de permisos: barra «pantallas seleccionadas N de M» con Todas y Ninguna, y la lista de módulos con scroll
// conecta con: RolesPermissionsScreen (lo usa), PermissionModuleCard, permissions.selection (conteo y todas/ninguna) y MENU_ITEMS
import React from 'react'
import type { NavItem } from '@/features/navigation'
import { countScreens, emptyModule, setAllModules, type PermissionsMap } from '../../helpers/permissions.selection'
import { PermissionModuleCard } from './PermissionModuleCard'
import './PermissionsSelector.css'

interface PermissionsSelectorProps {
  items: NavItem[]
  value: PermissionsMap
  onChange: (next: PermissionsMap) => void
  readOnly?: boolean // true: solo se ven los permisos (sin Todas/Ninguna ni cambios)
}

export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({ items, value, onChange, readOnly = false }) => {
  const { selected, total } = countScreens(value, items)

  return (
    <>
      <div className="permissions-summary">
        <span>
          Pantallas seleccionadas: <strong>{selected}</strong> de {total}
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

      <div className="permissions-list">
        {items.map((item) => (
          <PermissionModuleCard
            key={item.id}
            item={item}
            permission={value[item.id] ?? emptyModule(item)}
            onChange={(next) => onChange({ ...value, [item.id]: next })}
            readOnly={readOnly}
          />
        ))}
      </div>

      <p className="permissions-helper">
        Activa un módulo completo o solo algunas pantallas. Cada pantalla activa empieza con acceso completo; con los chips puedes quitar crear, editar o anular.
      </p>
    </>
  )
}
