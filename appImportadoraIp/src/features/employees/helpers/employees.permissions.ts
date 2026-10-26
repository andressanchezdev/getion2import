// employees.permissions · arma la matriz de permisos por módulo y pantalla a partir de lo que devuelve el servidor
// conecta con: RolesPermissionsScreen y MENU_ITEMS (navigation); lo que el servidor no trae se completa como SOLO LECTURA (nunca crear, editar ni anular)
import { MENU_ITEMS } from '@/features/navigation'
import type { ModulePermission } from '../types/employees.types'

const READ_ONLY = { canRead: true, canCreate: false, canUpdate: false, canDelete: false } as const

// permisos del servidor, o solo lectura para lo que el servidor no trae
export const buildModulesMap = (modules: ModulePermission[]): Record<string, ModulePermission> => {
  const map: Record<string, ModulePermission> = {}
  MENU_ITEMS.forEach((item) => {
    map[item.id] = modules.find((found) => found.moduleKey === item.id) ?? {
      moduleKey: item.id,
      ...READ_ONLY,
      screens: item.subitems.map((sub) => ({ screenKey: sub.id, ...READ_ONLY })),
    }
  })
  return map
}
