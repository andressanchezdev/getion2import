// usePermissions · hook de validación jerárquica de permisos (admin bypass, módulos y pantallas)
// conecta con: auth slice (user, permissions), SideMenu (filtrado dinámico) y MainContent (guardia)
import { useMemo } from 'react'
import { useAppSelector } from '../store/useRedux'
import { MENU_ITEMS, type ERPModule, type NavItem } from '@/features/navigation'
import { canLevelSee, getActorLevel, labelForLevel } from '../../helpers/access/accessLevels'

export const usePermissions = () => {
  const { user, permissions } = useAppSelector((state) => state.auth)
  const level = getActorLevel(user?.userType)
  const isAdmin = level === 'admin' || level === 'superadmin'

  // el nivel (accessLevels) manda: un módulo o pantalla de otro nivel no se ve aunque la matriz diga que sí
  const hasModuleAccess = (moduleKey: ERPModule): boolean => {
    if (!canLevelSee(level, moduleKey)) return false
    if (isAdmin) return true
    if (!permissions?.modules || permissions.modules.length === 0) return true
    const mod = permissions.modules.find((m) => m.moduleKey === moduleKey)
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
    if (!permissions?.modules || permissions.modules.length === 0) return true
    if (!hasModuleAccess(moduleKey)) return false
    const mod = permissions.modules.find((m) => m.moduleKey === moduleKey)
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
    if (isAdmin) return true
    if (!permissions?.modules || permissions.modules.length === 0) return true
    const mod = permissions.modules.find((m) => m.moduleKey === moduleKey)
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

  const canEditPrices = isAdmin || canPerformAction('inventory', 'products', 'editPrices') || canPerformAction('shop', 'catalog', 'editPrices')

  return {
    level,
    isAdmin,
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
