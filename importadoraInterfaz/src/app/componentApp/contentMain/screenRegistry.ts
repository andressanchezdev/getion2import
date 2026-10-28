// screenRegistry · mapa de qué pantalla de feature se muestra por módulo y subgestión
// conecta con: MainContent (pide la pantalla); las pantallas vienen de features/shop, features/orders, features/wallet y features/customers
// ojo: para sumar una pantalla nueva solo se agrega una línea aquí (antes eran if encadenados dentro de MainContent)
import { createElement, type ComponentType, type ReactNode } from 'react'
import type { ERPModule } from '@/features/navigation'
import { ShopCatalogScreen } from '@/features/shop'
import { OrdersScreen } from '@/features/orders'
import { WalletScreen } from '@/features/wallet'
import { CustomersScreen } from '@/features/customers'
import { SettingsScreen } from '@/features/settings'
import { TransfersScreen } from '@/features/transfers'
import { EmployeesScreen, RolesPermissionsScreen } from '@/features/employees'

interface ScreenEntry {
  screen?: ComponentType // pantalla para cualquier subgestión del módulo
  subitems?: Record<string, ComponentType> // pantalla por id de subgestión
}

export const SCREEN_REGISTRY: Partial<Record<ERPModule, ScreenEntry>> = {
  shop: { subitems: { catalog: ShopCatalogScreen, orders: OrdersScreen } },
  wallet: { screen: WalletScreen },
  thirdParties: {
    subitems: {
      customers: CustomersScreen,
      employees: EmployeesScreen,
      rolesPermissions: RolesPermissionsScreen,
    },
  },
  settings: { screen: SettingsScreen },
  inventory: { subitems: { transfers: TransfersScreen } },
  transfers: { screen: TransfersScreen },
}

// devuelve la pantalla del módulo/subgestión ya creada, o null si todavía no existe (se muestra el aviso de "Próxima Fase")
export const renderScreen = (moduleId: ERPModule, subitemId: string): ReactNode => {
  const entry = SCREEN_REGISTRY[moduleId]
  const Screen = entry?.subitems?.[subitemId] ?? entry?.screen
  return Screen ? createElement(Screen) : null
}
