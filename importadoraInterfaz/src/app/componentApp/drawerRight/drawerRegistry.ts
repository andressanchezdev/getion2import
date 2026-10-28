// drawerRegistry · define cuándo se abre el panel derecho y qué muestra en cada caso
// conecta con: DrawerRight (lo consulta); contenido de features/shop (carrito), features/orders (pedido abierto), features/wallet (estado de cuenta) y features/customers (cliente abierto)
// ojo: el panel tiene cuatro modos: carrito (tienda > catálogo), pedido (tienda > pedidos), cliente de cartera (objeto) y cliente de Terceros (customer); para un objeto nuevo se agrega un modo aquí
import type { ComponentType } from 'react'
import type { AppDispatch, RootState } from '@/app/store/store'
import { ShopCartDrawer, selectCartDrawerMeta } from '@/features/shop'
import {
  CreditAccountDrawer,
  selectAccountDrawerMeta,
  selectHasSelectedCustomer,
  setAccountDrawerOpen,
} from '@/features/wallet'
import { CustomerDrawer, selectCustomerDrawerMeta, selectHasOpenCustomer, selectCustomer } from '@/features/customers'
import { OrderDrawer, closeOrder, selectHasOpenOrder, selectOrderDrawerMeta } from '@/features/orders'
import cartIcon from '@/assets/icons/cart.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import userIcon from '@/assets/icons/user.svg'
import orderIcon from '@/assets/icons/file-text.svg'

export type DrawerMode = 'cart' | 'order' | 'object' | 'customer'

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
  const { activeModule, activeSubitem } = state.ui
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
    close: (dispatch) => dispatch(closeOrder()),
  },
  object: {
    Body: CreditAccountDrawer,
    icon: walletIcon,
    selectMeta: selectAccountDrawerMeta,
    close: (dispatch) => dispatch(setAccountDrawerOpen(false)),
  },
  customer: {
    Body: CustomerDrawer,
    icon: userIcon,
    selectMeta: selectCustomerDrawerMeta,
    close: (dispatch) => dispatch(selectCustomer(null)),
  },
}
