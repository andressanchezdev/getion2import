// ShopCartEmpty · mensaje del carrito vacío
// conecta con: ShopCartDrawer (se muestra cuando no hay items)
// ojo: como el «El carrito está vacío.» de la maqueta, solo texto; se quitó el emoji y se conserva la pista de qué hacer
import React from 'react'
import './ShopCartEmpty.css'

export const ShopCartEmpty: React.FC = () => {
  return (
    <div className="shop-cart-empty">
      <p className="shop-cart-empty-text">El carrito está vacío.</p>
      <span className="shop-cart-empty-hint">Selecciona repuestos en el catálogo y haz clic en "Ordenar".</span>
    </div>
  )
}

export default ShopCartEmpty
