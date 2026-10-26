// catalogs.constants · tamaño de página y estado inicial de los catálogos
// conecta con: catalogs.service (cuántos registros pide) y catalogs.slice (initialState)
// ojo: el Swagger exige page y pageSize en marcas, categorías y modelos pero no devuelve meta; se pide una sola página grande para traer todo el catálogo
import type { CatalogResource, CatalogsState } from '../types/catalogs.types'

export const CATALOG_PAGE_SIZE = 500

const emptyResource = <T>(): CatalogResource<T> => ({ items: [], status: 'idle', error: null })

export const INITIAL_CATALOGS_STATE: CatalogsState = {
  brands: emptyResource(),
  categories: emptyResource(),
  models: emptyResource(),
}
