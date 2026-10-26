// shop.cart.types · props de las partes del carrito
// conecta con: ShopCartItem (la pinta ShopCartDrawer)
import type { CartItem } from './shop.types'

export interface ShopCartItemProps {
  item: CartItem
}
