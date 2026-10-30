// navigation.constants · estado inicial de la navegación (módulo, subgestión, bodega y caja de arranque)
// conecta con: navigation.slice (initialState)
import type { NavigationState } from '../types/navigation.types'

export const INITIAL_NAVIGATION_STATE: NavigationState = {
  activeModule: 'shop',
  activeSubitem: 'catalog',
  sidebarOpen: true,
  rightDrawerOpen: false,
  // ojo: antes arrancaba con la bodega fija 'WH-01'; ahora arranca vacía y WarehouseSelector elige la real cuando llegan las bodegas del backend
  activeWarehouseId: '',
  activeWarehouseName: 'Cargando bodega…',
  cashRegisterStatus: 'open',
}

// Retrocompatibilidad
export const INITIAL_UI_STATE = INITIAL_NAVIGATION_STATE
