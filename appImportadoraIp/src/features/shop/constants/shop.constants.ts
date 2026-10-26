// shop.constants · niveles de precio, filtros y estado inicial
// conecta con: shop.slice (initialState), ShopCatalogScreen
import type { CatalogFilter, PriceLevelOption, ShopState } from '../types/shop.types'

// texto de la opción 'sin filtro' en los selectores de categoría y marca (el valor interno es null)
export const ALL_FILTER_OPTION = 'Todas'

// ojo: antes aquí estaban CATALOG_CATEGORIES y CATALOG_BRANDS (listas fijas); ahora las categorías y marcas salen del backend (features/catalogs)

// tamaños de lo que se pide al backend: página del catálogo y máximo de resultados de la búsqueda por texto
export const PRODUCTS_PAGE_SIZE = 30
export const SEARCH_LIMIT = 50

export const PRICE_LEVEL_OPTIONS: PriceLevelOption[] = [
    { key: 'P0', label: 'P0 · Mostrador', description: 'Precio al detal / público' },
    { key: 'P1', label: 'P1 · Taller', description: 'Precio mecánico / taller' },
    { key: 'P2', label: 'P2 · Distribuidor', description: 'Precio almacén de repuestos' },
    { key: 'P3', label: 'P3 · Mayorista', description: 'Precio mayorista especial' },
]

export const INITIAL_CATALOG_FILTERS: CatalogFilter = {
    searchQuery: '',
    selectedCategoryId: null,
    selectedBrandId: null,
    onlyInStock: false,
    priceLevel: 'P0',
}

export const INITIAL_SHOP_STATE: ShopState = {
    filters: INITIAL_CATALOG_FILTERS,
    cartUuid: '',
    cartLevels: {},
    cartCustomer: null,
    selectedProductId: null,
    isCartDrawerOpen: false,
}
