// catalogs/index · API pública de la feature catalogs (marcas, categorías y modelos de moto)
// conecta con: rootReducer (reducer), ShopCatalogScreen (useLoadCatalogs), ShopCatalogToolbar y ShopCatalogFilters (nombres para los filtros)
export * from './types/catalogs.types'
export * from './selectors/catalogs.selectors'
export * from './slices/catalogs.slice'
export * from './thunks/catalogs.thunks'
export * from './hooks/useLoadCatalogs'
