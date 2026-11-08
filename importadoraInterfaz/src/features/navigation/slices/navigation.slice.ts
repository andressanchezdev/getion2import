// navigation.slice · estado de navegación (clave 'ui'): módulo, subitem, bodega y usuario activos
// conecta con: SideMenu, MainContent, DrawerRight, AppHeader (leen/disparan estas acciones)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type DrawerForm, type ERPModule, type HistoryTarget } from '../types/navigation.types'
import { MENU_ITEMS } from '../constants/menuItems.constants'
import { INITIAL_NAVIGATION_STATE } from '../constants/navigation.constants'

export const navigationSlice = createSlice({
  name: 'ui', // Mantenemos la clave 'ui' en el store para persistencia y compatibilidad
  initialState: INITIAL_NAVIGATION_STATE,
  reducers: {
    setActiveModule: (state, action: PayloadAction<ERPModule>) => {
      state.activeModule = action.payload
      state.drawerForm = null // una acción abierta es de la pantalla anterior
      const menuItem = MENU_ITEMS.find((item) => item.id === action.payload)
      if (menuItem && menuItem.subitems.length > 0) {
        state.activeSubitem = menuItem.subitems[0].id
      }
    },
    setActiveSubitem: (state, action: PayloadAction<string>) => {
      state.activeSubitem = action.payload
      state.drawerForm = null
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    // abre una acción (crear, recibir, ver detalle) en el panel derecho; cerrarla vuelve al contenido anterior del panel
    openDrawerForm: (state, action: PayloadAction<DrawerForm>) => {
      state.drawerForm = action.payload
    },
    closeDrawerForm: (state) => {
      state.drawerForm = null
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
    // el superadmin salta de compañía: la bodega activa era de la anterior, se vacía para que WarehouseSelector elija una de la nueva
    // ojo: rootReducer borra además los datos de las demás features (productos, carrito, clientes...) al ver esta acción
    setActiveCompany: (state, action: PayloadAction<{ id: number; name: string }>) => {
      state.activeCompanyId = action.payload.id
      state.activeCompanyName = action.payload.name
      state.activeWarehouseId = INITIAL_NAVIGATION_STATE.activeWarehouseId
      state.activeWarehouseName = INITIAL_NAVIGATION_STATE.activeWarehouseName
    },
    // abre la auditoría ya apuntando a un registro (lo usan los botones «Ver historial»)
    openHistory: (state, action: PayloadAction<HistoryTarget>) => {
      state.historyTarget = action.payload
      state.drawerForm = null
      state.activeModule = 'reports'
      state.activeSubitem = 'audit'
    },
    clearHistoryTarget: (state) => {
      state.historyTarget = null
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
  openDrawerForm,
  closeDrawerForm,
  setRightDrawerOpen,
  setActiveWarehouse,
  setActiveCompany,
  openHistory,
  clearHistoryTarget,
  setCashRegisterStatus,
} = navigationSlice.actions

export const navigationReducer = navigationSlice.reducer
export default navigationSlice.reducer
