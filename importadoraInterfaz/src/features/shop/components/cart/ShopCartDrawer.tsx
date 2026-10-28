// ShopCartDrawer · carrito POS (diseño de la maqueta): cliente de la venta, buscador, lista de cards (o vacío) y pie con subtotal, IVA y total
// ojo: el encabezado (título y detalle) lo pinta el panel derecho (DrawerHeader) con shop.selectors (selectCartDrawerMeta)
// conecta con: shop.cart.slice (vía shop.selectors); las partes son ShopCartCustomer, ShopCartSearch, ShopCartItem, ShopCartEmpty y ShopCartFooter; lo muestra DrawerRight en la tienda
// ojo: como en la maqueta el pie (totales y botón) se ve siempre, aunque el carrito esté vacío (con el botón inactivo)
import React, { useState } from 'react'
import './ShopCartDrawer.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { selectCartItems } from '../../selectors/shop.selectors'
import { ShopCartItem } from './ShopCartItem'
import { ShopCartCustomer } from './customer/ShopCartCustomer'
import { ShopCartSearch } from './search/ShopCartSearch'
import { ShopCartEmpty } from './ShopCartEmpty'
import { ShopCartFooter } from './ShopCartFooter'
import type { CartItem } from '../../types/shop.types'

// texto en el que busca el buscador del carrito: código, marca, modelo, descripción y categoría
const searchableText = ({ product }: CartItem): string =>
  [product.code, product.brand, product.modelCompatible, product.description, product.category, product.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const ShopCartDrawer: React.FC = () => {
  // ojo: las líneas vienen del backend (shop.cart.slice) con el nivel de precio con que se agregó cada una
  const cart = useAppSelector(selectCartItems)
  const [query, setQuery] = useState('')

  const text = query.trim().toLowerCase()
  const lines = text ? cart.filter((item) => searchableText(item).includes(text)) : cart

  return (
    <div className="shop-cart-drawer">
      {/* Cliente de la venta (si se eligió uno en Terceros) */}
      <ShopCartCustomer />

      {/* Buscador de las líneas del carrito */}
      <ShopCartSearch value={query} onChange={setQuery} />

      {/* Lista de Items en Carrito */}
      <div className="shop-cart-items-container">
        {cart.length === 0 ? (
          <ShopCartEmpty />
        ) : lines.length === 0 ? (
          <p className="shop-cart-no-match">Sin coincidencias en el carrito</p>
        ) : (
          <ul className="shop-cart-list">
            {lines.map((item) => (
              <ShopCartItem key={item.cartId} item={item} />
            ))}
          </ul>
        )}
      </div>

      {/* Pie con Totales y Botones de Acción */}
      <ShopCartFooter />
    </div>
  )
}

export default ShopCartDrawer
