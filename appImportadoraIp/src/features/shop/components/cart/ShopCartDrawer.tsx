// ShopCartDrawer · carrito POS: lista de items (o vacío) y pie con total
// ojo: el encabezado (título y cantidad de artículos) ahora lo pinta el panel derecho (DrawerHeader) con shop.selectors (selectCartDrawerMeta)
// conecta con: shop.cart.slice (vía shop.selectors); las partes son ShopCartItem, ShopCartEmpty y ShopCartFooter; lo muestra DrawerRight en la tienda
import React from 'react'
import './ShopCartDrawer.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { selectCartItems } from '../../selectors/shop.selectors'
import { ShopCartItem } from './ShopCartItem'
import { ShopCartCustomer } from './customer/ShopCartCustomer'
import { ShopCartEmpty } from './ShopCartEmpty'
import { ShopCartFooter } from './ShopCartFooter'

export const ShopCartDrawer: React.FC = () => {
  // ojo: las líneas vienen del backend (shop.cart.slice) con el nivel de precio con que se agregó cada una
  const cart = useAppSelector(selectCartItems)

  return (
    <div className="shop-cart-drawer">
      {/* Cliente de la venta (si se eligió uno en Terceros) */}
      <ShopCartCustomer />

      {/* Lista de Items en Carrito */}
      <div className="shop-cart-items-container">
        {cart.length > 0 ? (
          <div className="shop-cart-list">
            {cart.map((item) => (
              <ShopCartItem key={item.cartId} item={item} />
            ))}
          </div>
        ) : (
          <ShopCartEmpty />
        )}
      </div>

      {/* Pie con Totales y Botones de Acción */}
      {cart.length > 0 && <ShopCartFooter />}
    </div>
  )
}

export default ShopCartDrawer
