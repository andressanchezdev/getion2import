// ShopCatalogToolbar · fila de herramientas: búsqueda, filtros de categoría y marca como chips y checkbox «con stock»; limpiar filtros vive dentro de la barra de búsqueda
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { ChipSelect } from '@/global/components/UI/molecules/chips/ChipSelect'
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
    <div className="shop-catalog-search-row">
      <SearchBar
        value={filters.searchQuery}
        onChange={(val) => dispatch(setSearchQuery(val))}
        hasActiveFilters={hasActiveFilters}
        onClear={() => dispatch(resetFilters())}
        placeholder="Buscar por código, repuesto, marca o modelo de moto..."
        className="shop-catalog-search-bar"
      />

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

      {/* Checkbox de stock */}
      <label className="shop-catalog-stock-check">
        <input
          type="checkbox"
          checked={filters.onlyInStock}
          onChange={(e) => dispatch(setOnlyInStock(e.target.checked))}
        />
        <span>Con stock en bodega</span>
      </label>

    </div>
  )
}

export default ShopCatalogToolbar
