// ShopCatalogEmpty · estado vacío cuando ningún repuesto coincide con los filtros
// conecta con: ShopCatalogScreen (le pasa la bodega, si hay filtros y la acción de restablecer)
import React from 'react'
import type { ShopCatalogEmptyProps } from '../../types/shop.catalog.types'
import './ShopCatalogEmpty.css'
import { Icon } from '@/global/components/UI/atoms/Icon'
import searchIcon from '@/assets/icons/search.svg?raw'

export const ShopCatalogEmpty: React.FC<ShopCatalogEmptyProps> = ({ warehouseName, hasActiveFilters, onReset }) => {
  return (
    <div className="shop-catalog-empty-state">
      <div className="shop-catalog-empty-state-icon"><Icon svg={searchIcon} size="xl" /></div>
      <h3 className="shop-catalog-empty-state-title">No se encontraron repuestos</h3>
      <p className="shop-catalog-empty-state-desc">
        No hay productos que coincidan con los filtros aplicados en{' '}
        <strong>{warehouseName}</strong>.
      </p>
      {hasActiveFilters && (
        <button type="button" onClick={onReset} className="shop-catalog-empty-state-btn">
          Restablecer búsqueda y filtros
        </button>
      )}
    </div>
  )
}

export default ShopCatalogEmpty
