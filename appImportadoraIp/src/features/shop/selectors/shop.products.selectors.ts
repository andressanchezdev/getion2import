// shop.products.selectors · lecturas de la lista de productos: estado de carga, paginación, productos visibles y resumen de resultados
// conecta con: ShopCatalogScreen, ShopCatalogPagination y useProductsLoader; leen state.products, los filtros de state.shop, la bodega de state.ui y los catálogos (marcas y categorías)
// ojo: en modo "list" los filtros ya los aplicó el backend; en modo "search" (texto) el backend no filtra por marca, categoría ni stock, así que aquí se aplican en pantalla
import { createSelector } from '@reduxjs/toolkit'
import type { NavigationState } from '@/features/navigation'
import { selectBrands, selectCategories, type CatalogsState } from '@/features/catalogs'
import { getWarehouseStock } from '../helpers/shop.helpers'
import type { ProductsState } from '../types/shop.api.types'
import type { ShopState } from '../types/shop.types'

// forma mínima del state (así la feature no importa el store de app)
type ProductsRootState = { products: ProductsState; shop: ShopState; ui: NavigationState; catalogs: CatalogsState }

export const selectProducts = (state: ProductsRootState) => state.products.items
export const selectProductsStatus = (state: ProductsRootState) => state.products.status
export const selectProductsError = (state: ProductsRootState) => state.products.error
export const selectProductsMeta = (state: ProductsRootState) => state.products.meta
export const selectProductsMode = (state: ProductsRootState) => state.products.mode
export const selectProductsPage = (state: ProductsRootState) => state.products.page

const selectFilters = (state: ProductsRootState) => state.shop.filters
const selectActiveWarehouseId = (state: ProductsRootState) => state.ui.activeWarehouseId

// productos que se pintan: sin cambios en modo "list"; en modo "search" se filtran por marca, categoría y stock de la bodega activa
export const selectVisibleProducts = createSelector(
  [selectProducts, selectProductsMode, selectFilters, selectBrands, selectCategories, selectActiveWarehouseId],
  (products, mode, filters, brands, categories, activeWarehouseId) => {
    if (mode === 'list') return products
    const brandName = brands.find((brand) => brand.id === filters.selectedBrandId)?.name
    const categoryName = categories.find((category) => category.id === filters.selectedCategoryId)?.name
    return products.filter((product) => {
      if (filters.selectedBrandId !== null && brandName && product.brand !== brandName) return false
      if (filters.selectedCategoryId !== null && categoryName && product.category !== categoryName) return false
      if (filters.onlyInStock && getWarehouseStock(product, activeWarehouseId) <= 0) return false
      return true
    })
  }
)

// "Mostrando X de Y": en modo "list" Y es el total del backend (todas las páginas); en búsqueda, lo que devolvió el backend
export const selectResultsSummary = createSelector(
  [selectVisibleProducts, selectProducts, selectProductsMeta, selectProductsMode],
  (visible, all, meta, mode) => ({
    shown: visible.length,
    total: mode === 'list' && meta ? meta.totalRecords : all.length,
  })
)
