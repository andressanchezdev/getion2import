// usePermissions · hook de validación jerárquica de permisos (admin bypass, módulos y pantallas)
// conecta con: auth slice (user, permissions), SideMenu (filtrado dinámico) y MainContent (guardia)
import { useMemo } from 'react'
import { useAppSelector } from './useRedux'
import { MENU_ITEMS, type ERPModule, type NavItem } from '@/features/navigation'

export const usePermissions = () => {
  const { user, permissions } = useAppSelector((state) => state.auth)
  const isAdmin = user?.userType === 'admin'

  const hasModuleAccess = (moduleKey: ERPModule): boolean => {
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
    action: 'create' | 'update' | 'delete'
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
    return false
  }

  return {
    isAdmin,
    hasModuleAccess,
    hasScreenAccess,
    canPerformAction,
  }
}

export const useFilteredMenuItems = (): NavItem[] => {
  const { isAdmin, hasModuleAccess, hasScreenAccess } = usePermissions()

  return useMemo(() => {
    if (isAdmin) return MENU_ITEMS

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
        subitems: visibleSubitems,
      }
    }).filter((item): item is NavItem => item !== null)
  }, [isAdmin, hasModuleAccess, hasScreenAccess])
}

export default usePermissions
