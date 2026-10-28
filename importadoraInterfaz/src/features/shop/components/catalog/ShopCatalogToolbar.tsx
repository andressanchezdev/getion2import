// ShopCatalogToolbar · fila de herramientas: búsqueda, filtros de categoría y marca como chips, «con stock» y limpiar filtros
// conecta con: shop.slice (filtros), shop.selectors (hay filtros activos), catalogs (marcas y categorías del backend), global SearchBar, ChipSelect y FilterChip
// ojo: como los chips de la maqueta (Marca ▾, Categoría ▾): sin etiqueta aparte, el nombre del filtro es la opción vacía y el chip se pinta amarillo cuando hay uno elegido; los chips son los de global/UI/molecules/chips
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { ChipSelect } from '@/global/components/UI/molecules/chips/ChipSelect'
import { FilterChip } from '@/global/components/UI/molecules/chips/FilterChip'
import {
  setSearchQuery,
  setSelectedCategory,
  setSelectedBrand,
  setOnlyInStock,
  resetFilters,
} from '../../slices/shop.slice'
import { selectBrands, selectCategories } from '@/features/catalogs'
import { BRAND_FILTER_LABEL, CATEGORY_FILTER_LABEL } from '../../constants/shop.constants'
import { selectHasActiveFilters } from '../../selectors/shop.selectors'
import './ShopCatalogToolbar.css'

// el valor elegido llega como texto; null = sin filtro
const toId = (value: string | null): number | null => (value === null ? null : Number(value))

export const ShopCatalogToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.shop.filters)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)
  const brands = useAppSelector(selectBrands)
  const categories = useAppSelector(selectCategories)

  return (
    /* Fila de herramientas: buscador, chips de categoría y marca, toggle de stock y limpiar */
    <div className="shop-catalog-search-row">
      <SearchBar
        value={filters.searchQuery}
        onChange={(val) => dispatch(setSearchQuery(val))}
        placeholder="Buscar por código, repuesto, marca o modelo de moto..."
        className="shop-catalog-search-bar"
      />

      {/* ojo: el valor de cada opción es el id (el backend filtra por id); la opción vacía lleva el nombre del filtro */}
      <ChipSelect
        label={CATEGORY_FILTER_LABEL}
        value={filters.selectedCategoryId}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        onChange={(value) => dispatch(setSelectedCategory(toId(value)))}
      />
      <ChipSelect
        label={BRAND_FILTER_LABEL}
        value={filters.selectedBrandId}
        options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
        onChange={(value) => dispatch(setSelectedBrand(toId(value)))}
      />

      {/* Toggle de stock (chip) y limpiar filtros */}
      <FilterChip label="Con stock en bodega" active={filters.onlyInStock} onClick={() => dispatch(setOnlyInStock(!filters.onlyInStock))} />

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
  )
}

export default ShopCatalogToolbar
