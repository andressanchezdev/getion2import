// navigation.helpers · funciones simples para leer el menú sin repetir lógica
// conecta con: MainContent (título), menuItems.constants (fuente de datos)
import { MENU_ITEMS, MODULE_HEADER_ICONS, MODULE_HEADER_TITLES } from '../constants/menuItems.constants'
import type { ERPModule } from '../types/navigation.types'

// devuelve el texto visible (español) de un subitem a partir de su id; si no existe devuelve ''
export const getSubitemLabel = (moduleId: ERPModule, subitemId: string): string => {
  const item = MENU_ITEMS.find((menuItem) => menuItem.id === moduleId)
  return item?.subitems.find((sub) => sub.id === subitemId)?.label ?? ''
}

// título del módulo para el encabezado (ej. shop -> Tienda)
export const getModuleTitle = (moduleId: ERPModule): string => MODULE_HEADER_TITLES[moduleId]

// ícono del módulo para el encabezado
export const getModuleIcon = (moduleId: ERPModule): string => MODULE_HEADER_ICONS[moduleId]
