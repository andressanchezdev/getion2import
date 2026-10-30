// drawerRegistry · define cuándo se abre el panel derecho y qué muestra en cada caso
import type { ComponentType } from 'react'
import type { AppDispatch, RootState } from '@/app/store/store'
import { setRightDrawerOpen } from '@/features/navigation'
import { ShopCartDrawer, selectCartDrawerMeta } from '@/features/shop'
import {
  CreditAccountDrawer,
  selectAccountDrawerMeta,
  selectHasSelectedCustomer,
  setAccountDrawerOpen,
} from '@/features/wallet'
import { CustomerDrawer, selectCustomerDrawerMeta, selectHasOpenCustomer, selectCustomer } from '@/features/customers'
import { OrderDrawer, closeOrder, selectHasOpenOrder, selectOrderDrawerMeta } from '@/features/orders'
import { ContextualActionsDrawer } from './parts/ContextualActionsDrawer'
import cartIcon from '@/assets/icons/cart.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import userIcon from '@/assets/icons/user.svg'
import orderIcon from '@/assets/icons/file-text.svg'
import settingsIcon from '@/assets/icons/settings.svg'

export type DrawerMode = 'cart' | 'order' | 'object' | 'customer' | 'actions'

// texto del encabezado del panel (lo calcula un selector de cada feature)
export interface DrawerMeta {
  title: string
  subtitle?: string
  tag?: string
  badge?: string
}

interface DrawerEntry {
  Body: ComponentType // contenido del panel
  icon: string
  selectMeta: (state: RootState) => DrawerMeta
  close?: (dispatch: AppDispatch) => void // si no existe, el panel solo se contrae (carrito)
}

// modo del panel según lo que haya en pantalla; null = el panel no se muestra
export const selectDrawerMode = (state: RootState): DrawerMode | null => {
  const { activeModule, activeSubitem, rightDrawerOpen } = state.ui

  // Si el usuario abrió expresamente el panel mediante el botón de acciones superior derecho
  if (rightDrawerOpen) {
    if (activeModule === 'shop' && activeSubitem === 'catalog') return 'cart'
    if (activeModule === 'shop' && activeSubitem === 'orders' && selectHasOpenOrder(state)) return 'order'
    if (activeModule === 'wallet' && selectHasSelectedCustomer(state)) return 'object'
    if (activeModule === 'thirdParties' && activeSubitem === 'customers' && selectHasOpenCustomer(state)) return 'customer'
    return 'actions'
  }

  // Modos automáticos por contexto
  if (activeModule === 'shop' && activeSubitem === 'catalog') return 'cart'
  if (activeModule === 'shop' && activeSubitem === 'orders' && selectHasOpenOrder(state)) return 'order'
  if (activeModule === 'wallet' && selectHasSelectedCustomer(state)) return 'object'
  if (activeModule === 'thirdParties' && activeSubitem === 'customers' && selectHasOpenCustomer(state)) return 'customer'
  return null
}

export const DRAWER_REGISTRY: Record<DrawerMode, DrawerEntry> = {
  cart: {
    Body: ShopCartDrawer,
    icon: cartIcon,
    selectMeta: selectCartDrawerMeta,
  },
  order: {
    Body: OrderDrawer,
    icon: orderIcon,
    selectMeta: selectOrderDrawerMeta,
    close: (dispatch) => {
      dispatch(closeOrder())
      dispatch(setRightDrawerOpen(false))
    },
  },
  object: {
    Body: CreditAccountDrawer,
    icon: walletIcon,
    selectMeta: selectAccountDrawerMeta,
    close: (dispatch) => {
      dispatch(setAccountDrawerOpen(false))
      dispatch(setRightDrawerOpen(false))
    },
  },
  customer: {
    Body: CustomerDrawer,
    icon: userIcon,
    selectMeta: selectCustomerDrawerMeta,
    close: (dispatch) => {
      dispatch(selectCustomer(null))
      dispatch(setRightDrawerOpen(false))
    },
  },
  actions: {
    Body: ContextualActionsDrawer,
    icon: settingsIcon,
    selectMeta: (state: RootState) => ({
      title: 'Panel de Acciones',
      subtitle: `Opciones activas para ${state.ui.activeModule}`,
      tag: 'Acciones Rápidas',
    }),
    close: (dispatch) => dispatch(setRightDrawerOpen(false)),
  },
}
