// ModulePermissionRow · fila de módulo y sus pantallas hijas en la matriz de permisos
// conecta con: employees.types, navigation.types, RolesPermissionsScreen y tokens.css
import React from 'react'
import type { NavItem } from '@/features/navigation'
import type { ModulePermission, ScreenPermission } from '../types/employees.types'

interface Props {
  item: NavItem
  permission: ModulePermission
  onChange: (updated: ModulePermission) => void
}

export const ModulePermissionRow: React.FC<Props> = ({ item, permission, onChange }) => {
  const handleToggleModule = (field: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') => {
    const nextVal = !permission[field]
    const updatedScreens = (permission.screens || []).map((s) => ({
      ...s,
      [field]: nextVal,
    }))
    onChange({
      ...permission,
      [field]: nextVal,
      screens: updatedScreens,
    })
  }

  const handleToggleScreen = (
    screenKey: string,
    field: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
  ) => {
    const existingScreens = [...(permission.screens || [])]
    const idx = existingScreens.findIndex((s) => s.screenKey === screenKey)
    let currentScreen: ScreenPermission

    if (idx >= 0) {
      currentScreen = { ...existingScreens[idx], [field]: !existingScreens[idx][field] }
      existingScreens[idx] = currentScreen
    } else {
      currentScreen = {
        screenKey,
        canRead: field === 'canRead',
        canCreate: field === 'canCreate',
        canUpdate: field === 'canUpdate',
        canDelete: field === 'canDelete',
      }
      existingScreens.push(currentScreen)
    }

    const anyScreenReadable = existingScreens.some((s) => s.canRead)

    onChange({
      ...permission,
      canRead: permission.canRead || anyScreenReadable,
      screens: existingScreens,
    })
  }

  const getScreenVal = (
    screenKey: string,
    field: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
  ): boolean => {
    const s = permission.screens?.find((sc) => sc.screenKey === screenKey)
    return s ? Boolean(s[field]) : false
  }

  return (
    <>
      <tr className="permissions-module-header">
        <td>
          <strong>{item.label}</strong>
        </td>
        <td>
          <input
            type="checkbox"
            className="permissions-checkbox"
            checked={permission.canRead}
            onChange={() => handleToggleModule('canRead')}
          />
        </td>
        <td>
          <input
            type="checkbox"
            className="permissions-checkbox"
            checked={permission.canCreate}
            onChange={() => handleToggleModule('canCreate')}
          />
        </td>
        <td>
          <input
            type="checkbox"
            className="permissions-checkbox"
            checked={permission.canUpdate}
            onChange={() => handleToggleModule('canUpdate')}
          />
        </td>
        <td>
          <input
            type="checkbox"
            className="permissions-checkbox"
            checked={permission.canDelete}
            onChange={() => handleToggleModule('canDelete')}
          />
        </td>
      </tr>

      {item.subitems.map((sub) => (
        <tr key={sub.id} className="permissions-subitem-row">
          <td className="permissions-subitem-name">↳ {sub.label}</td>
          <td>
            <input
              type="checkbox"
              className="permissions-checkbox"
              checked={getScreenVal(sub.id, 'canRead')}
              onChange={() => handleToggleScreen(sub.id, 'canRead')}
            />
          </td>
          <td>
            <input
              type="checkbox"
              className="permissions-checkbox"
              checked={getScreenVal(sub.id, 'canCreate')}
              onChange={() => handleToggleScreen(sub.id, 'canCreate')}
            />
          </td>
          <td>
            <input
              type="checkbox"
              className="permissions-checkbox"
              checked={getScreenVal(sub.id, 'canUpdate')}
              onChange={() => handleToggleScreen(sub.id, 'canUpdate')}
            />
          </td>
          <td>
            <input
              type="checkbox"
              className="permissions-checkbox"
              checked={getScreenVal(sub.id, 'canDelete')}
              onChange={() => handleToggleScreen(sub.id, 'canDelete')}
            />
          </td>
        </tr>
      ))}
    </>
  )
}
