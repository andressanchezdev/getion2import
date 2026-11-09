// navigation.constants · estado inicial de la navegación (módulo, subgestión, bodega y caja de arranque)
// conecta con: navigation.slice (initialState)
import type { NavigationState } from '../types/navigation.types'

// texto de la compañía activa cuando el superadmin no eligió ninguna
export const ALL_COMPANIES_LABEL = 'Todas las compañías'

export const INITIAL_NAVIGATION_STATE: NavigationState = {
  activeModule: 'shop',
  activeSubitem: 'catalog',
  sidebarOpen: true,
  rightDrawerOpen: false,
  // ojo: antes arrancaba con la bodega fija 'WH-01'; ahora arranca vacía y WarehouseSelector elige la real cuando llegan las bodegas del backend
  activeWarehouseId: '',
  activeWarehouseName: 'Cargando bodega…',
  activeCompanyId: 0,
  activeCompanyName: ALL_COMPANIES_LABEL,
  historyTarget: null,
  drawerForm: null,
  cashRegisterStatus: 'open',
}
