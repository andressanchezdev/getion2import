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

// ---- ruta del navegador ----
// la URL refleja la pantalla activa: /módulo/subgestión (por ejemplo /shop/orders); la pantalla la sigue decidiendo screenRegistry
export const toRoutePath = (moduleId: ERPModule, subitemId: string): string => `/${moduleId}/${subitemId}`

// lee una ruta y devuelve el módulo y la subgestión que le corresponden, o null si no es una pantalla del ERP
// ojo: /módulo (sin subgestión) abre la primera del módulo; un módulo sin subgestiones en el menú (como settings) acepta cualquiera
export const parseRoutePath = (pathname: string): { module: ERPModule; subitem: string } | null => {
  const [moduleId, subitemId] = pathname.split('/').filter(Boolean)
  if (!moduleId || !(moduleId in MODULE_HEADER_TITLES)) return null
  const module = moduleId as ERPModule
  const subitems = MENU_ITEMS.find((item) => item.id === module)?.subitems ?? []
  if (subitems.length === 0) return subitemId ? { module, subitem: subitemId } : null
  if (!subitemId) return { module, subitem: subitems[0].id }
  return subitems.some((sub) => sub.id === subitemId) ? { module, subitem: subitemId } : null
}
