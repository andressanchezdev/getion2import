// permissions.selection · reglas de la selección visual de permisos: pantalla activada, módulo completo, todas y ninguna, y los permisos finos (ver, crear, editar, anular, editar precios)
// conecta con: PermissionsSelector, PermissionModuleCard y PermissionToggleCard (los usan); tipos de employees.types y NavItem
// ojo: activar una pantalla le da acceso completo (ver, crear, editar y anular); después se puede afinar con los chips de permisos de cada pantalla
// ojo: los permisos del módulo se recalculan siempre a partir de sus pantallas (ver = alguna pantalla visible; crear/editar/anular = alguna pantalla lo tiene)
import type { NavItem } from '@/features/navigation'
import type { ModulePermission, ScreenPermission } from '../types/employees.types'

export type PermissionFlag = 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canEditPrices'

export type PermissionsMap = Record<string, ModulePermission>

export const PERMISSION_FLAGS: Array<{ key: PermissionFlag; label: string }> = [
  { key: 'canRead', label: 'Ver' },
  { key: 'canCreate', label: 'Crear' },
  { key: 'canUpdate', label: 'Editar' },
  { key: 'canDelete', label: 'Anular' },
  { key: 'canEditPrices', label: 'Editar precios' },
]

export const flagsForScreen = (screenKey: string): Array<{ key: PermissionFlag; label: string }> => {
  if (screenKey === 'products' || screenKey === 'catalog') {
    return PERMISSION_FLAGS
  }
  return PERMISSION_FLAGS.filter((f) => f.key !== 'canEditPrices')
}

// devuelve los permisos de una pantalla dentro de un módulo (todos apagados si no estaba)
const screenOf = (permission: ModulePermission, screenKey: string): ScreenPermission =>
  permission.screens?.find((screen) => screen.screenKey === screenKey) ?? {
    screenKey,
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canEditPrices: false,
  }

// devuelve el módulo con los permisos de esa pantalla reemplazados y los del módulo recalculados
const withScreen = (permission: ModulePermission, next: ScreenPermission): ModulePermission => {
  const others = (permission.screens ?? []).filter((screen) => screen.screenKey !== next.screenKey)
  const screens = [...others, next]
  return {
    ...permission,
    screens,
    canRead: screens.some((screen) => screen.canRead),
    canCreate: screens.some((screen) => screen.canCreate),
    canUpdate: screens.some((screen) => screen.canUpdate),
    canDelete: screens.some((screen) => screen.canDelete),
    canEditPrices: screens.some((screen) => Boolean(screen.canEditPrices)),
  }
}

// arma los permisos de ver, crear, editar y eliminar todos prendidos o apagados (editar precios siempre apagado)
const fullAccess = (on: boolean) => ({ canRead: on, canCreate: on, canUpdate: on, canDelete: on, canEditPrices: false })

// dice si la pantalla está activa, es decir, si el empleado puede verla
export const isScreenOn = (permission: ModulePermission, screenKey: string): boolean => screenOf(permission, screenKey).canRead

// prende o apaga una pantalla completa
export const toggleScreen = (permission: ModulePermission, screenKey: string): ModulePermission =>
  withScreen(permission, { ...screenOf(permission, screenKey), ...fullAccess(!isScreenOn(permission, screenKey)) })

// prende o apaga una acción (ver, crear, editar...) de una pantalla
export const toggleScreenFlag = (permission: ModulePermission, screenKey: string, flag: PermissionFlag): ModulePermission => {
  const current = screenOf(permission, screenKey)
  const next = { ...current, [flag]: !current[flag] }
  // ver es la base: sin ver no se puede crear, editar ni anular; y activar cualquier permiso deja la pantalla visible
  if (flag === 'canRead' && !next.canRead) Object.assign(next, fullAccess(false))
  if (flag !== 'canRead' && next[flag]) next.canRead = true
  return withScreen(permission, next)
}

// dice si todas las pantallas del módulo están activas
export const isModuleFull = (permission: ModulePermission, item: NavItem): boolean =>
  item.subitems.length > 0 && item.subitems.every((sub) => isScreenOn(permission, sub.id))

// prende o apaga todas las pantallas de un módulo
export const setModule = (permission: ModulePermission, item: NavItem, on: boolean): ModulePermission =>
  item.subitems.reduce((acc, sub) => withScreen(acc, { ...screenOf(acc, sub.id), ...fullAccess(on) }), permission)

// si el módulo está completo lo apaga y si no lo prende completo
export const toggleModule = (permission: ModulePermission, item: NavItem): ModulePermission =>
  setModule(permission, item, !isModuleFull(permission, item))

// prende o apaga todos los módulos de una vez
export const setAllModules = (map: PermissionsMap, items: NavItem[], on: boolean): PermissionsMap =>
  Object.fromEntries(items.map((item) => [item.id, setModule(map[item.id] ?? emptyModule(item), item, on)]))

// crea los permisos de un módulo con todo apagado
export const emptyModule = (item: NavItem): ModulePermission => setModule({ moduleKey: item.id, ...fullAccess(false), screens: [] }, item, false)

// cuántas pantallas están activadas y cuántas hay en total (para «N de M»)
export const countScreens = (map: PermissionsMap, items: NavItem[]): { selected: number; total: number } => ({
  selected: items.reduce((sum, item) => sum + item.subitems.filter((sub) => map[item.id] && isScreenOn(map[item.id], sub.id)).length, 0),
  total: items.reduce((sum, item) => sum + item.subitems.length, 0),
})

// resumen para mostrar en lista: cada módulo con las pantallas que tiene activadas y, de cada una, sus acciones (Ver, Crear, Editar, Anular, Editar precios); lo que no tiene no sale
export interface PermissionSummaryModule {
  module: string
  screens: Array<{ screen: string; actions: string[] }>
}

// arma la lista de módulos y pantallas con las acciones activas, para mostrarla en el detalle del empleado
export const summarizePermissions = (map: PermissionsMap, items: NavItem[]): PermissionSummaryModule[] =>
  items
    .map((item) => ({
      module: item.label,
      screens: item.subitems
        .filter((sub) => map[item.id] && isScreenOn(map[item.id], sub.id))
        .map((sub) => {
          const screen = map[item.id].screens.find((candidate) => candidate.screenKey === sub.id)
          return { screen: sub.label, actions: PERMISSION_FLAGS.filter((flag) => screen?.[flag.key]).map((flag) => flag.label) }
        }),
    }))
    .filter((module) => module.screens.length > 0)
