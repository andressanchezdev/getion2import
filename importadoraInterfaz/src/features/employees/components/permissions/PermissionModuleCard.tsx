// PermissionModuleCard · un módulo con su tarjeta «módulo completo» y las tarjetas de sus pantallas en dos columnas; las activas muestran opciones de ver, crear, editar, anular (y editar precios si aplica)
// conecta con: PermissionsSelector (la usa), PermissionToggleCard, permissions.selection (reglas) y employees.types
import React from 'react'
import type { NavItem } from '@/features/navigation'
import {
  flagsForScreen,
  isModuleFull,
  isScreenOn,
  toggleModule,
  toggleScreen,
  toggleScreenFlag,
  type PermissionFlag,
} from '../../helpers/permissions.selection'
import type { ModulePermission } from '../../types/employees.types'
import { PermissionToggleCard } from './PermissionToggleCard'

interface PermissionModuleCardProps {
  item: NavItem
  permission: ModulePermission
  onChange: (next: ModulePermission) => void
  readOnly?: boolean
}

export const PermissionModuleCard: React.FC<PermissionModuleCardProps> = ({ item, permission, onChange, readOnly = false }) => {
  const flagOf = (screenKey: string, flag: PermissionFlag): boolean =>
    Boolean(permission.screens?.find((screen) => screen.screenKey === screenKey)?.[flag])

  return (
    <div className="permission-module">
      <PermissionToggleCard
        strong
        disabled={readOnly}
        label={`${item.label} (módulo completo)`}
        checked={isModuleFull(permission, item)}
        onToggle={() => onChange(toggleModule(permission, item))}
      />

      {item.subitems.length > 1 && (
        <div className="permission-module-grid">
          {item.subitems.map((sub) => (
            <PermissionToggleCard
              key={sub.id}
              label={sub.label}
              checked={isScreenOn(permission, sub.id)}
              disabled={readOnly}
              onToggle={() => onChange(toggleScreen(permission, sub.id))}
            >
              <div className="permission-flags" aria-label={`Permisos de ${sub.label}`}>
                {flagsForScreen(sub.id).map((flag) => (
                  <button
                    key={flag.key}
                    type="button"
                    role="checkbox"
                    className={`permission-flag ${flagOf(sub.id, flag.key) ? 'permission-flag-on' : ''}`}
                    aria-checked={flagOf(sub.id, flag.key)}
                    disabled={readOnly}
                    onClick={() => onChange(toggleScreenFlag(permission, sub.id, flag.key))}
                  >
                    <span className={`permission-card-box ${flagOf(sub.id, flag.key) ? 'permission-card-box-on' : ''}`} aria-hidden="true">
                      {flagOf(sub.id, flag.key) ? '✓' : ''}
                    </span>
                    {flag.label}
                  </button>
                ))}
              </div>
            </PermissionToggleCard>
          ))}
        </div>
      )}
    </div>
  )
}

export default PermissionModuleCard
