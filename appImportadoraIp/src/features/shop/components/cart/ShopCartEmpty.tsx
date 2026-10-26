// ShopCartEmpty · mensaje del carrito vacío
// conecta con: ShopCartDrawer (se muestra cuando no hay items)
import React from 'react'
import './ShopCartEmpty.css'

export const ShopCartEmpty: React.FC = () => {
  return (
    <div className="shop-cart-empty">
      <div className="shop-cart-empty-icon">🛒</div>
      <p className="shop-cart-empty-text">El carrito está vacío</p>
      <span className="shop-cart-empty-hint">
        Selecciona repuestos en el catálogo y haz clic en "Ordenar".
      </span>
    </div>
  )
}

export default ShopCartEmpty
