// navigation.types · contratos del menú y del estado de navegación (ui)
// conecta con: menuItems.constants, navigation.slice, SideMenu, MainContent, DrawerRight
export type ERPModule =
  | 'shop'
  | 'sales'
  | 'cashRegister' // alias retrocompatible
  | 'purchases'
  | 'inventory'
  | 'transfers'    // alias retrocompatible
  | 'wallet'
  | 'thirdParties'
  | 'reports'
  | 'settings'

// ojo: antes subitems era string[] y la lógica comparaba el texto visible; ahora id (código) + label (cliente)
export interface NavSubitem {
  id: string
  label: string
}

export interface NavItem {
  id: ERPModule
  label: string
  icon: string
  subitems: NavSubitem[]
  badgeCount?: number
}

// ojo: el usuario y la empresa ya no se guardan aquí; salen de la sesión (features/auth)
export interface UIState {
  activeModule: ERPModule
  activeSubitem: string
  sidebarOpen: boolean
  rightDrawerOpen: boolean
  activeWarehouseId: string
  activeWarehouseName: string
  cashRegisterStatus: 'open' | 'closed'
}

// Alias semántico para Navigation
export type NavigationState = UIState
