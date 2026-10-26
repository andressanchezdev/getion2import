// ShopCartItem · una línea del carrito: datos del repuesto, cantidad y precios
// conecta con: shop.cart.thunks (cambiar cantidad y quitar en el backend); la pinta ShopCartDrawer por cada item
import React from 'react'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { removeCartItemThunk, updateCartQuantityThunk } from '../../thunks/shop.cart.update.thunks'
import { selectCartMutating } from '../../selectors/shop.selectors'
import type { ShopCartItemProps } from '../../types/shop.cart.types'
import './ShopCartItem.css'

export const ShopCartItem: React.FC<ShopCartItemProps> = ({ item }) => {
  const dispatch = useAppDispatch()
  // mientras el backend procesa un cambio se bloquean los botones (evita dobles clics)
  const isBusy = useAppSelector(selectCartMutating)

  // cambia la cantidad en +1 o -1 (si llega a 0 el thunk quita la línea)
  const changeQuantity = (delta: number) => {
    dispatch(updateCartQuantityThunk({ cartId: item.cartId, quantity: item.quantity + delta }))
  }

  return (
    <div className="shop-cart-item">
      <div className="shop-cart-item-header">
        <div>
          <h4 className="shop-cart-item-name">{item.product.name}</h4>
          <div className="shop-cart-item-meta">
            <span className="shop-cart-item-sku">{item.product.code}</span>
            <span className="shop-cart-item-brand">{item.product.brand}</span>
            {item.priceLevel && <span className="shop-cart-item-level-tag">{item.priceLevel}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch(removeCartItemThunk(item.cartId))}
          disabled={isBusy}
          className="shop-cart-item-remove-btn"
          title="Eliminar del carrito"
        >
          ✕
        </button>
      </div>

      <div className="shop-cart-item-footer">
        {/* Stepper de Cantidad */}
        <div className="shop-cart-stepper">
          <button type="button" onClick={() => changeQuantity(-1)} disabled={isBusy} className="shop-cart-stepper-btn">
            -
          </button>
          <span className="shop-cart-stepper-value">{item.quantity}</span>
          <button type="button" onClick={() => changeQuantity(1)} disabled={isBusy} className="shop-cart-stepper-btn">
            +
          </button>
        </div>

        {/* Precios */}
        <div className="shop-cart-item-pricing">
          <span className="shop-cart-item-unit-price">{formatCOP(item.selectedPrice)} c/u</span>
          <span className="shop-cart-item-subtotal">{formatCOP(item.subtotal)}</span>
        </div>
      </div>
    </div>
  )
}

export default ShopCartItem
