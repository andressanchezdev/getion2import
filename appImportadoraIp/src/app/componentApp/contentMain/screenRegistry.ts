// screenRegistry · mapa de qué pantalla de feature se muestra por módulo y subgestión
// conecta con: MainContent (pide la pantalla); las pantallas vienen de features/shop, wallet, customers, sales, reports, suppliers, inventory, management, quotations, transfers y employees
// ojo: para sumar una pantalla nueva solo se agrega una línea aquí (antes eran if encadenados dentro de MainContent)
import { createElement, type ComponentType, type ReactNode } from 'react'
import type { ERPModule } from '@/features/navigation'
import { ShopCatalogScreen } from '@/features/shop'
import { WalletScreen } from '@/features/wallet'
import { CustomersScreen } from '@/features/customers'
import { SettingsScreen } from '@/features/settings'
import { TransfersScreen } from '@/features/transfers'
import { EmployeesScreen, RolesPermissionsScreen } from '@/features/employees'
import { PendingCartsScreen, SalesHistoryScreen } from '@/features/sales'
import { SuppliersScreen } from '@/features/suppliers'
import { ProductControlScreen } from '@/features/inventory'
import { CatalogsScreen } from '@/features/catalogs'
import { PipelineScreen } from '@/features/management'
import { QuotationsScreen } from '@/features/quotations'
import { DailySalesScreen, GeneralReportScreen, InventoryReportScreen } from '@/features/reports'

interface ScreenEntry {
  screen?: ComponentType // pantalla para cualquier subgestión del módulo
  subitems?: Record<string, ComponentType> // pantalla por id de subgestión
}

export const SCREEN_REGISTRY: Partial<Record<ERPModule, ScreenEntry>> = {
  shop: { subitems: { catalog: ShopCatalogScreen, orders: PendingCartsScreen, history: SalesHistoryScreen, quotations: QuotationsScreen } },
  wallet: { screen: WalletScreen },
  thirdParties: {
    subitems: {
      customers: CustomersScreen,
      suppliers: SuppliersScreen,
      employees: EmployeesScreen,
      rolesPermissions: RolesPermissionsScreen,
    },
  },
  reports: { subitems: { dailySales: DailySalesScreen, generalReport: GeneralReportScreen, inventoryReport: InventoryReportScreen } },
  cashRegister: { subitems: { posBilling: PipelineScreen } },
  settings: { screen: SettingsScreen },
  inventory: { subitems: { products: ProductControlScreen, transfers: TransfersScreen, catalogs: CatalogsScreen } },
  transfers: { screen: TransfersScreen },
}

// devuelve la pantalla del módulo/subgestión ya creada, o null si todavía no existe (se muestra el aviso de "Próxima Fase")
export const renderScreen = (moduleId: ERPModule, subitemId: string): ReactNode => {
  const entry = SCREEN_REGISTRY[moduleId]
  const Screen = entry?.subitems?.[subitemId] ?? entry?.screen
  return Screen ? createElement(Screen) : null
}
