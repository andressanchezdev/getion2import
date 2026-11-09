// drawerRegistry · define cuándo se abre el panel derecho y qué muestra en cada caso
import type { ComponentType } from 'react'
import { createSelector } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from '@/app/store/store'
import { closeDrawerForm, setRightDrawerOpen } from '@/features/navigation'
import { ShopCartDrawer, selectCartDrawerMeta } from '@/features/shop'
import {
  CreditAccountDrawer,
  selectAccountDrawerMeta,
  selectHasSelectedCustomer,
  setAccountDrawerOpen,
} from '@/features/wallet'
import { QuotationCartDrawer, selectQuotationCartMeta } from '@/features/quotations'
import { CustomerDrawer, selectCustomerDrawerMeta, selectHasOpenCustomer, selectCustomer } from '@/features/customers'
import { OrderDrawer, closeOrder, selectHasOpenOrder, selectOrderDrawerMeta } from '@/features/orders'
import { FormDrawerBody } from './parts/FormDrawerBody'
import { getFormEntry } from './formRegistry'
import cartIcon from '@/assets/icons/cart.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import userIcon from '@/assets/icons/user.svg'
import orderIcon from '@/assets/icons/file-text.svg'

// ojo: las acciones (crear, recibir, ver detalle) se abren en el modo «form»; ya no hay botón de acciones en el header, cada acción está en su tabla
export type DrawerMode = 'cart' | 'quotationCart' | 'order' | 'object' | 'customer' | 'form'

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
  const { activeModule, activeSubitem, drawerForm } = state.ui

  // una acción abierta manda sobre el contenido automático de la pantalla
  if (drawerForm) return 'form'

  // Modos automáticos por contexto
  if (activeModule === 'shop' && activeSubitem === 'catalog') return 'cart'
  if (activeModule === 'shop' && activeSubitem === 'quotationCatalog') return 'quotationCart'
  if (((activeModule === 'shop' && activeSubitem === 'orders') || (activeModule === 'cashRegister' && activeSubitem === 'billingHistory')) && selectHasOpenOrder(state)) return 'order'
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
  quotationCart: {
    Body: QuotationCartDrawer,
    icon: cartIcon,
    selectMeta: selectQuotationCartMeta,
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
  form: {
    Body: FormDrawerBody,
    icon: userIcon,
    selectMeta: createSelector([(state: RootState) => state.ui.drawerForm], (form): DrawerMeta => {
      const entry = form ? getFormEntry(form) : null
      return { title: entry && form ? entry.title(form.payload) : 'Acción', subtitle: entry?.subtitle }
    }),
    close: (dispatch) => dispatch(closeDrawerForm()),
  },
}
