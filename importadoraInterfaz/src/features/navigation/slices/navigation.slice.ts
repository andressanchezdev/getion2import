// navigation.slice · estado de navegación (clave 'ui'): módulo, subitem, bodega y usuario activos
// conecta con: SideMenu, MainContent, DrawerRight, AppHeader (leen/disparan estas acciones)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type ERPModule } from '../types/navigation.types'
import { MENU_ITEMS } from '../constants/menuItems.constants'
import { INITIAL_NAVIGATION_STATE } from '../constants/navigation.constants'

export const navigationSlice = createSlice({
  name: 'ui', // Mantenemos la clave 'ui' en el store para persistencia y compatibilidad
  initialState: INITIAL_NAVIGATION_STATE,
  reducers: {
    setActiveModule: (state, action: PayloadAction<ERPModule>) => {
      state.activeModule = action.payload
      const menuItem = MENU_ITEMS.find((item) => item.id === action.payload)
      if (menuItem && menuItem.subitems.length > 0) {
        state.activeSubitem = menuItem.subitems[0].id
      }
    },
    setActiveSubitem: (state, action: PayloadAction<string>) => {
      state.activeSubitem = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    toggleRightDrawer: (state) => {
      state.rightDrawerOpen = !state.rightDrawerOpen
    },
    setRightDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.rightDrawerOpen = action.payload
    },
    setActiveWarehouse: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      state.activeWarehouseId = action.payload.id
      state.activeWarehouseName = action.payload.name
    },
    setCashRegisterStatus: (state, action: PayloadAction<'open' | 'closed'>) => {
      state.cashRegisterStatus = action.payload
    },
  },
})

export const {
  setActiveModule,
  setActiveSubitem,
  toggleSidebar,
  setSidebarOpen,
  toggleRightDrawer,
  setRightDrawerOpen,
  setActiveWarehouse,
  setCashRegisterStatus,
} = navigationSlice.actions

export const navigationReducer = navigationSlice.reducer
export const uiReducer = navigationSlice.reducer
export default navigationSlice.reducer
