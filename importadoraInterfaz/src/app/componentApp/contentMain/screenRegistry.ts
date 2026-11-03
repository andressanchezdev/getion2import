// screenRegistry · qué componente de pantalla se muestra para cada combinación de módulo y subgestión
import { createElement, type ComponentType, type ReactNode } from 'react'
import type { ERPModule } from '@/features/navigation'
import { ShopCatalogScreen } from '@/features/shop'
import { OrdersScreen } from '@/features/orders'
import { QuotationsScreen } from '@/features/quotations'
import { BrandsScreen, CategoriesScreen, ModelsScreen, ProductsScreen, InventoryCountsScreen } from '@/features/inventory'
import { WarehousesScreen } from '@/features/warehouses'
import { LocationsScreen } from '@/features/locations'
import { CustomersScreen } from '@/features/customers'
import { EmployeesScreen, RolesPermissionsScreen } from '@/features/employees'
import { CashRegisterScreen } from '@/features/cashRegister'
import { ReturnsScreen } from '@/features/returns'
import { WalletScreen } from '@/features/wallet'
import { AuditScreen } from '@/features/audit'
import { TransfersScreen } from '@/features/transfers'
import { SettingsScreen } from '@/features/settings'
import { PurchaseOrdersScreen, ReceivingScreen } from '@/features/purchases'
import { BillingSettingsScreen, InvoicesScreen } from '@/features/billing'
import { SuppliersScreen, CarriersScreen } from '@/features/externals'
import { GeneralReportScreen, DashboardScreen } from '@/features/reports'
import { RecycleBinScreen } from '@/features/recyclebin'
import { SuperadminAdminsScreen } from '@/features/superadmin'
import { NotFoundScreen } from './NotFoundScreen'

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
