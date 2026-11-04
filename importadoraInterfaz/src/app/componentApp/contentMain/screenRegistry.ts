// screenRegistry · qué componente de pantalla se muestra para cada combinación de módulo y subgestión
// Optimizado: ShopCatalogScreen se importa de forma inmediata para el renderizado instantáneo del catálogo.
// Las pantallas secundarias y administrativas se cargan de forma diferida (code-splitting con React.lazy)
// apuntando a sus rutas específicas de pantalla para que Vite las desacople en chunks independientes
// sin modificar en lo absoluto la apariencia visual ni la estructura de navegación.
import { createElement, lazy, type ComponentType, type ReactNode } from 'react'
import type { ERPModule } from '@/features/navigation'
import { ShopCatalogScreen } from '@/features/shop'
import { NotFoundScreen } from './NotFoundScreen'

const OrdersScreen = lazy(() => import('@/features/orders/screens/OrdersScreen').then((m) => ({ default: m.OrdersScreen })))
const QuotationsScreen = lazy(() => import('@/features/quotations/screens/QuotationsScreen').then((m) => ({ default: m.QuotationsScreen })))
const BrandsScreen = lazy(() => import('@/features/inventory/screens/CatalogScreens').then((m) => ({ default: m.BrandsScreen })))
const CategoriesScreen = lazy(() => import('@/features/inventory/screens/CatalogScreens').then((m) => ({ default: m.CategoriesScreen })))
const ModelsScreen = lazy(() => import('@/features/inventory/screens/CatalogScreens').then((m) => ({ default: m.ModelsScreen })))
const ProductsScreen = lazy(() => import('@/features/inventory/screens/ProductsScreen').then((m) => ({ default: m.ProductsScreen })))
const InventoryCountsScreen = lazy(() => import('@/features/inventory/screens/InventoryCountsScreen').then((m) => ({ default: m.InventoryCountsScreen })))
const WarehousesScreen = lazy(() => import('@/features/warehouses/screens/WarehousesScreen').then((m) => ({ default: m.WarehousesScreen })))
const LocationsScreen = lazy(() => import('@/features/locations/screens/LocationsScreen').then((m) => ({ default: m.LocationsScreen })))
const CustomersScreen = lazy(() => import('@/features/customers/screens/CustomersScreen').then((m) => ({ default: m.CustomersScreen })))
const EmployeesScreen = lazy(() => import('@/features/employees/screens/EmployeesScreen').then((m) => ({ default: m.EmployeesScreen })))
const RolesPermissionsScreen = lazy(() => import('@/features/employees/screens/RolesPermissionsScreen').then((m) => ({ default: m.RolesPermissionsScreen })))
const CashRegisterScreen = lazy(() => import('@/features/cashRegister/screens/CashRegisterScreen').then((m) => ({ default: m.CashRegisterScreen })))
const ReturnsScreen = lazy(() => import('@/features/returns/screens/ReturnsScreen').then((m) => ({ default: m.ReturnsScreen })))
const WalletScreen = lazy(() => import('@/features/wallet/screens/WalletScreen').then((m) => ({ default: m.WalletScreen })))
const AuditScreen = lazy(() => import('@/features/audit/screens/AuditScreen').then((m) => ({ default: m.AuditScreen })))
const TransfersScreen = lazy(() => import('@/features/transfers/screens/TransfersScreen').then((m) => ({ default: m.TransfersScreen })))
const SettingsScreen = lazy(() => import('@/features/settings/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })))
const PurchaseOrdersScreen = lazy(() => import('@/features/purchases/screens/PurchaseOrdersScreen').then((m) => ({ default: m.PurchaseOrdersScreen })))
const ReceivingScreen = lazy(() => import('@/features/purchases/screens/ReceivingScreen').then((m) => ({ default: m.ReceivingScreen })))
const BillingSettingsScreen = lazy(() => import('@/features/billing/screens/BillingSettingsScreen').then((m) => ({ default: m.BillingSettingsScreen })))
const InvoicesScreen = lazy(() => import('@/features/billing/screens/InvoicesScreen').then((m) => ({ default: m.InvoicesScreen })))
const SuppliersScreen = lazy(() => import('@/features/externals/screens/SuppliersScreen').then((m) => ({ default: m.SuppliersScreen })))
const CarriersScreen = lazy(() => import('@/features/externals/screens/CarriersScreen').then((m) => ({ default: m.CarriersScreen })))
const GeneralReportScreen = lazy(() => import('@/features/reports/screens/GeneralReportScreen').then((m) => ({ default: m.GeneralReportScreen })))
const DashboardScreen = lazy(() => import('@/features/reports/screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen })))
const RecycleBinScreen = lazy(() => import('@/features/recyclebin/screens/RecycleBinScreen').then((m) => ({ default: m.RecycleBinScreen })))
const SuperadminAdminsScreen = lazy(() => import('@/features/superadmin/screens/SuperadminAdminsScreen').then((m) => ({ default: m.SuperadminAdminsScreen })))

export interface ScreenEntry {
  screen?: ComponentType // pantalla única para todo el módulo
  subitems?: Record<string, ComponentType> // pantalla por id de subgestión
}

export const SCREEN_REGISTRY: Partial<Record<ERPModule, ScreenEntry>> = {
  shop: {
    subitems: {
      catalog: ShopCatalogScreen,
      quotations: QuotationsScreen,
      orders: OrdersScreen,
      transfers: TransfersScreen,
      receiving: ReceivingScreen,
      cashRegister: CashRegisterScreen,
      generalReport: GeneralReportScreen,
    },
  },
  cashRegister: {
    subitems: {
      billingHistory: OrdersScreen,
      invoices: InvoicesScreen,
      purchaseOrders: PurchaseOrdersScreen,
      returns: ReturnsScreen,
    },
  },
  inventory: {
    subitems: {
      warehouses: WarehousesScreen,
      products: ProductsScreen,
      counts: InventoryCountsScreen,
      brands: BrandsScreen,
      categories: CategoriesScreen,
      models: ModelsScreen,
      locations: LocationsScreen,
    },
  },
  wallet: { screen: WalletScreen },
  thirdParties: {
    subitems: {
      customers: CustomersScreen,
      employees: EmployeesScreen,
      suppliers: SuppliersScreen,
      carriers: CarriersScreen,
    },
  },
  settings: {
    subitems: {
      company: SettingsScreen,
      billing: BillingSettingsScreen,
      rolesPermissions: RolesPermissionsScreen,
    },
  },
  transfers: { screen: TransfersScreen },
  reports: {
    subitems: {
      dashboard: DashboardScreen,
      general: GeneralReportScreen,
      recycleBin: RecycleBinScreen,
      dailySales: DashboardScreen,
      inventoryReport: GeneralReportScreen,
      audit: AuditScreen,
    },
  },
  superadmin: {
    subitems: {
      admins: SuperadminAdminsScreen,
    },
  },
}

// devuelve la pantalla del módulo/subgestión ya creada, o NotFoundScreen con el diseño de protector si no existe
export const renderScreen = (moduleId: ERPModule, subitemId: string): ReactNode => {
  const entry = SCREEN_REGISTRY[moduleId]
  if (!entry) return createElement(NotFoundScreen)
  const Component = entry.subitems?.[subitemId] ?? entry.screen
  return Component ? createElement(Component) : createElement(NotFoundScreen)
}
