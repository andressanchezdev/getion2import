// ShopCartSearch · buscador del carrito: filtra las líneas por código, marca, modelo, descripción o categoría
// conecta con: ShopCartDrawer (le pasa el texto y recibe lo que se escribe); la lupa es de components/icons/ShopIcons
// ojo: es nuevo, como el «Buscar en el carrito» de la maqueta; solo filtra lo que ya está en el carrito (no pide nada al backend)
import React from 'react'
import { SearchIcon } from '../../icons/ShopIcons'
import './ShopCartSearch.css'

interface ShopCartSearchProps {
  value: string
  onChange: (value: string) => void
}

export const ShopCartSearch: React.FC<ShopCartSearchProps> = ({ value, onChange }) => {
  return (
    <div className="shop-cart-search">
      <SearchIcon />
      <input
        type="text"
        className="shop-cart-search-input"
        value={value}
        placeholder="Buscar en el carrito"
        aria-label="Buscar ítems del carrito"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default ShopCartSearch
