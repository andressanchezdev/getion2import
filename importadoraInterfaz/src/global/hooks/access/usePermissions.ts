// usePermissions · hook de validación jerárquica de permisos (admin bypass, módulos, pantallas y acciones especiales)
// conecta con: auth slice (user, permissions), SideMenu (filtrado dinámico), MainContent y FormDrawerBody (guardias) y cada tabla o drawer (visible/disabled)
// ojo: falla cerrada (8.2-1): un empleado sin matriz cargada (permisos vacíos, carga fallida o sesión vieja) no ve nada hasta que /auth/me los traiga
// ojo: can('modulo:accion') lee las llaves crudas del empleado; sirve para las acciones especiales que no caben en la matriz (avanzar etapa, facturar, reubicar…)
import { useMemo } from 'react'
import { useAppSelector } from '../store/useRedux'
import { MENU_ITEMS, type ERPModule, type NavItem } from '@/features/navigation'
import { canLevelSee, getActorLevel, labelForLevel, OPEN_STAFF_SCREENS } from '../../helpers/access/accessLevels'

// módulos de la API que el superadmin sí puede mutar (igual a governanceModules del backend)
const SUPERADMIN_GOVERNANCE = ['companies', 'admins', 'superadmin', 'screensaver', 'recyclebin', 'audit']

export const usePermissions = () => {
  const { user, permissions } = useAppSelector((state) => state.auth)
  const level = getActorLevel(user?.userType)
  const isAdmin = level === 'admin' || level === 'superadmin'
  // sin matriz no hay acceso para un empleado; admin y superadmin no usan matriz
  const modules = permissions?.modules ?? []
  const noMatrix = modules.length === 0

  // el nivel (accessLevels) manda: un módulo o pantalla de otro nivel no se ve aunque la matriz diga que sí
  const hasModuleAccess = (moduleKey: ERPModule): boolean => {
    if (!canLevelSee(level, moduleKey)) return false
    if (isAdmin) return true
    if ([...OPEN_STAFF_SCREENS].some((key) => key.startsWith(`${moduleKey}.`))) return true
    if (noMatrix) return false
    const mod = modules.find((m) => m.moduleKey === moduleKey)
    if (!mod) return false
    if (!mod.canRead) {
      const anyScreenReadable = mod.screens?.some((s) => s.canRead)
      return Boolean(anyScreenReadable)
    }
    return true
  }

  const hasScreenAccess = (moduleKey: ERPModule, screenKey: string): boolean => {
    if (!canLevelSee(level, moduleKey, screenKey)) return false
    if (isAdmin) return true
    if (OPEN_STAFF_SCREENS.has(`${moduleKey}.${screenKey}`)) return true
    if (noMatrix) return false
    if (!hasModuleAccess(moduleKey)) return false
    const mod = modules.find((m) => m.moduleKey === moduleKey)
    if (!mod) return false
    const screen = mod.screens?.find(
      (s) => s.screenKey === screenKey || String(s.screenId) === screenKey
    )
    if (screen) return screen.canRead !== false
    return mod.canRead !== false
  }

  const canPerformAction = (
    moduleKey: ERPModule,
    screenKey: string,
    action: 'create' | 'update' | 'delete' | 'editPrices'
  ): boolean => {
    // El Superadministrador solo tiene permisos de mutación en gobernanza
    if (level === 'superadmin') {
      const governanceModules: string[] = ['superadmin', 'screensaver', 'audit']
      return governanceModules.includes(moduleKey)
    }
    if (level === 'admin') return true
    if (noMatrix) return false
    const mod = modules.find((m) => m.moduleKey === moduleKey)
    if (!mod) return false
    const screen = mod.screens?.find(
      (s) => s.screenKey === screenKey || String(s.screenId) === screenKey
    )
    if (action === 'create') return screen ? screen.canCreate : mod.canCreate
    if (action === 'update') return screen ? screen.canUpdate : mod.canUpdate
    if (action === 'delete') return screen ? screen.canDelete : mod.canDelete
    if (action === 'editPrices') return screen ? Boolean(screen.canEditPrices) : Boolean(mod.canEditPrices)
    return false
  }

  // acción especial por llave de la API ('orders:advance_stage'); con varias llaves basta una
  // ojo: mismas reglas que la API (auth_middleware.actorAllows): admin todo, superadmin lee y muta solo gobernanza, empleado la llave exacta
  const can = (...keys: string[]): boolean => {
    if (level === 'admin') return true
    if (level === 'superadmin') {
      return keys.some((key) => {
        const [module, action] = key.split(':')
        return action === 'view' || action === 'view_detail' || SUPERADMIN_GOVERNANCE.includes(module)
      })
    }
    const owned = user?.permissions ?? []
    return keys.some((key) => owned.includes(key))
  }

  const canEditPrices = (level === 'admin') || can('products:edit_prices', 'catalog:edit_prices')

  return {
    level,
    isAdmin,
    can,
    canEditPrices,
    hasModuleAccess,
    hasScreenAccess,
    canPerformAction,
  }
}

// devuelve el menú con solo los módulos y pantallas que el usuario puede ver
export const useFilteredMenuItems = (): NavItem[] => {
  const { level, hasModuleAccess, hasScreenAccess } = usePermissions()

  return useMemo(() => {
    return MENU_ITEMS.map((item) => {
      if (!hasModuleAccess(item.id)) return null
      const visibleSubitems = item.subitems.filter((sub) =>
        hasScreenAccess(item.id, sub.id)
      )
      if (item.subitems.length > 0 && visibleSubitems.length === 0) {
        return null
      }
      return {
        ...item,
        // el nombre de algunas pantallas cambia según el nivel (superadmin: «Compañías» en vez de «Sedes»)
        subitems: visibleSubitems.map((sub) => ({ ...sub, label: labelForLevel(level, item.id, sub.id, sub.label) })),
      }
    }).filter((item): item is NavItem => item !== null)
  }, [level, hasModuleAccess, hasScreenAccess])
}

export default usePermissions
