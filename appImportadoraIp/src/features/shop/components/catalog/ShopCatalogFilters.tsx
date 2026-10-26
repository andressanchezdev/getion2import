// ShopCatalogFilters · resumen de resultados ("Mostrando X de Y repuestos")
// conecta con: los conteos que llegan por props desde ShopCatalogScreen
import React from 'react'
import type { ShopCatalogFiltersProps } from '../../types/shop.catalog.types'
import './ShopCatalogFilters.css'

export const ShopCatalogFilters: React.FC<ShopCatalogFiltersProps> = ({ resultsCount, totalCount }) => {
  return (
    /* Fila 2: Resumen de resultados */
    <div className="shop-catalog-filter-row">
      {/* Resumen de Resultados y Estado de Bodega */}
      <div className="shop-catalog-results-summary">
        <span className="shop-catalog-results-count">
          Mostrando <strong>{resultsCount}</strong> de{' '}
          {totalCount} repuestos
        </span>
      </div>
    </div>
  )
}

export default ShopCatalogFilters
