// navigation.types — contratos del menú y del estado de navegación (ui)
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
  | 'superadmin'

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

export interface HistoryTarget {
  entity: string
  entityId?: number
  label?: string
  entityType?: string
}

export type DrawerFormKind =
  | 'createCustomer'
  | 'createTransfer'
  | 'receiveTransfer'
  | 'auditDetail'
  | 'employeePermissions'
  | 'editCustomer'
  | 'quotationDetail'
  | 'roleForm'
  | 'companyWarehouses'
  | 'checkout'
  | 'employeeDetail'
  | 'productDetail'
  | 'editProduct'
  | 'productLocations'
  | 'relocateStock'
  | 'catalogItem'
  | 'catalogDetail'
  | 'enableCredit'
  | 'transferDetail'
  | 'bankConfirm'
  | 'createProduct'
  | 'qrLabels'
  | 'locationForm'
  | 'locationDetail'
  | 'externalForm'
  | 'warehouseForm'
  | 'warehouseDetail'
  | 'assignStock'
  | 'createAbono'
  | 'abonoDetail'
  | 'cashOpen'
  | 'cashClose'
  | 'cashCollect'
  | 'purchaseDetail'
  | 'purchaseReceive'
  | 'purchaseForm'
  | 'billingConfig'
  | 'docSeriesForm'
  | 'adminForm'
  | 'registerExpense'
  | 'reasonForm'
  | 'invoiceDetail'
  | 'verifyGoods'
  | 'countDetail'
  | 'permissionsHub'

export interface DrawerForm {
  kind: DrawerFormKind
  payload?: unknown
}

export interface UIState {
  activeModule: ERPModule
  activeSubitem: string
  sidebarOpen: boolean
  rightDrawerOpen: boolean
  drawerForm: DrawerForm | null
  activeWarehouseId: string
  activeWarehouseName: string
  activeCompanyId?: number
  activeCompanyName?: string
  historyTarget: HistoryTarget | null
  cashRegisterStatus: 'open' | 'closed'
  isMenuOpen?: boolean
  isSideMenuHovered?: boolean
  isPinned?: boolean
}

export type NavigationState = UIState
