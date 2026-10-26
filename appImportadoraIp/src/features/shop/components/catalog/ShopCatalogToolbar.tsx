// ShopCatalogToolbar · fila de búsqueda: texto, categoría, marca, y el grupo de controles ("con stock" y limpiar filtros)
// conecta con: shop.slice (filtros), shop.selectors (hay filtros activos), catalogs (marcas y categorías del backend), global SearchBar
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import {
  setSearchQuery,
  setSelectedCategory,
  setSelectedBrand,
  setOnlyInStock,
  resetFilters,
} from '../../slices/shop.slice'
import { selectBrands, selectCategories } from '@/features/catalogs'
import { ALL_FILTER_OPTION } from '../../constants/shop.constants'
import { selectHasActiveFilters } from '../../selectors/shop.selectors'
import './ShopCatalogToolbar.css'

export const ShopCatalogToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.shop.filters)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)
  const brands = useAppSelector(selectBrands)
  const categories = useAppSelector(selectCategories)

  return (
    /* Fila 1: Buscador Universal con categoría, marca y toggle de stock */
    <div className="shop-catalog-search-row">
      <SearchBar
        value={filters.searchQuery}
        onChange={(val) => dispatch(setSearchQuery(val))}
        placeholder="Buscar por código, repuesto, marca o modelo de moto..."
        className="shop-catalog-search-bar"
      />

      {/* Contenedor de Selectores: Categoría y Marca al mismo nivel */}
      <div className="shop-catalog-filter-select-wrapper">
        <label htmlFor="category-filter" className="shop-catalog-filter-group-label">
          Categoría:
        </label>
        <select
          id="category-filter"
          value={filters.selectedCategoryId ?? ''}
          onChange={(e) =>
            dispatch(setSelectedCategory(e.target.value === '' ? null : Number(e.target.value)))
          }
          className="shop-catalog-select"
        >
          {/* ojo: el valor de cada opción es el id de la categoría; 'Todas' es el valor vacío */}
          <option value="">{ALL_FILTER_OPTION}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="brand-filter" className="shop-catalog-filter-group-label">
          Marca:
        </label>
        <select
          id="brand-filter"
          value={filters.selectedBrandId ?? ''}
          onChange={(e) =>
            dispatch(setSelectedBrand(e.target.value === '' ? null : Number(e.target.value)))
          }
          className="shop-catalog-select"
        >
          {/* ojo: el valor de cada opción es el id de la marca (el backend filtra por id); 'Todas' es el valor vacío */}
          <option value="">{ALL_FILTER_OPTION}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* Toggle de stock y limpiar filtros */}
      <div className="shop-catalog-controls-group">
        <label className="shop-catalog-filter-checkbox-label">
          <input
            type="checkbox"
            checked={filters.onlyInStock}
            onChange={(e) => dispatch(setOnlyInStock(e.target.checked))}
            className="shop-catalog-filter-checkbox"
          />
          <span>Con stock en bodega</span>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => dispatch(resetFilters())}
            className="shop-catalog-reset-btn"
            title="Restablecer todos los filtros"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}

export default ShopCatalogToolbar
