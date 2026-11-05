// catalogs.selectors · lecturas de los catálogos: listas completas y solo los nombres (para los selectores de filtro)
// conecta con: ShopCatalogToolbar (marcas) y ShopCatalogFilters (categorías); leen state.catalogs
import { createSelector } from '@reduxjs/toolkit'
import type { CatalogsState } from '../types/catalogs.types'

// forma mínima del state (así la feature no importa el store de app)
type CatalogsRootState = { catalogs: CatalogsState }

export const selectBrands = (state: CatalogsRootState) => state.catalogs.brands.items
// lee las categorías cargadas
export const selectCategories = (state: CatalogsRootState) => state.catalogs.categories.items
// lee los modelos de moto cargados
export const selectMotoModels = (state: CatalogsRootState) => state.catalogs.models.items

// selectores de solo activos (para combos de creación de productos y filtros operativos)
export const selectActiveBrands = createSelector([selectBrands], (brands) =>
  brands.filter((b) => b.isActive !== false)
)
export const selectActiveCategories = createSelector([selectCategories], (cats) =>
  cats.filter((c) => c.isActive !== false)
)
export const selectActiveMotoModels = createSelector([selectMotoModels], (models) =>
  models.filter((m) => m.isActive !== false)
)

// lee el estado de carga de las marcas
export const selectBrandsStatus = (state: CatalogsRootState) => state.catalogs.brands.status
// lee el estado de carga de las categorías
export const selectCategoriesStatus = (state: CatalogsRootState) => state.catalogs.categories.status
// lee el estado de carga de los modelos de moto
export const selectMotoModelsStatus = (state: CatalogsRootState) => state.catalogs.models.status

// solo los nombres de registros activos, sin repetir (para filtros de tienda)
const uniqueActiveNames = (items: { name: string; isActive?: boolean }[]): string[] => [
  ...new Set(items.filter((item) => item.isActive !== false).map((item) => item.name)),
]

export const selectBrandNames = createSelector([selectBrands], uniqueActiveNames)
export const selectCategoryNames = createSelector([selectCategories], uniqueActiveNames)
