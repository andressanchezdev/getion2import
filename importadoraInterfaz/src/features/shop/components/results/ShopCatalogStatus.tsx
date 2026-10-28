// ShopCatalogStatus · aviso del catálogo mientras carga por primera vez o cuando el backend falla (con botón para reintentar)
// conecta con: ShopCatalogScreen (le pasa el estado y la acción de reintentar); el mensaje de error viene de shop.products.slice
import React from 'react'
import type { ShopCatalogStatusProps } from '../../types/shop.catalog.types'
import './ShopCatalogStatus.css'

export const ShopCatalogStatus: React.FC<ShopCatalogStatusProps> = ({ status, error, onRetry }) => {
  if (status === 'failed') {
    return (
      <div className="shop-catalog-status shop-catalog-status-error" role="alert">
        <h3 className="shop-catalog-status-title">No se pudieron cargar los repuestos</h3>
        <p className="shop-catalog-status-desc">{error}</p>
        <button type="button" onClick={onRetry} className="shop-catalog-status-btn">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="shop-catalog-status" role="status" aria-live="polite">
      <p className="shop-catalog-status-desc">Cargando repuestos…</p>
    </div>
  )
}

export default ShopCatalogStatus
