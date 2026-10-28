// catalogs.selectors · lecturas de los catálogos: listas completas y solo los nombres (para los selectores de filtro)
// conecta con: ShopCatalogToolbar (marcas) y ShopCatalogFilters (categorías); leen state.catalogs
import { createSelector } from '@reduxjs/toolkit'
import type { CatalogsState } from '../types/catalogs.types'

// forma mínima del state (así la feature no importa el store de app)
type CatalogsRootState = { catalogs: CatalogsState }

export const selectBrands = (state: CatalogsRootState) => state.catalogs.brands.items
export const selectCategories = (state: CatalogsRootState) => state.catalogs.categories.items
export const selectMotoModels = (state: CatalogsRootState) => state.catalogs.models.items
export const selectBrandsStatus = (state: CatalogsRootState) => state.catalogs.brands.status
export const selectCategoriesStatus = (state: CatalogsRootState) => state.catalogs.categories.status
export const selectMotoModelsStatus = (state: CatalogsRootState) => state.catalogs.models.status

// solo los nombres, sin repetir (dos marcas con el mismo nombre se mostrarían iguales en un filtro de texto)
const uniqueNames = (items: { name: string }[]): string[] => [...new Set(items.map((item) => item.name))]

export const selectBrandNames = createSelector([selectBrands], uniqueNames)
export const selectCategoryNames = createSelector([selectCategories], uniqueNames)
