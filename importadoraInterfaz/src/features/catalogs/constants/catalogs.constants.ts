// catalogs.constants · estado inicial de los catálogos
// conecta con: catalogs.slice (initialState)
// ojo: antes aquí estaba CATALOG_PAGE_SIZE (500); la API en Go devuelve marcas, categorías y modelos completos y sin paginar
import type { CatalogResource, CatalogsState } from '../types/catalogs.types'

const emptyResource = <T>(): CatalogResource<T> => ({ items: [], status: 'idle', error: null })

export const INITIAL_CATALOGS_STATE: CatalogsState = {
  brands: emptyResource(),
  categories: emptyResource(),
  models: emptyResource(),
}
