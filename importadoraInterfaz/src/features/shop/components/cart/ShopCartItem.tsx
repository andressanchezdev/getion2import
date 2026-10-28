// ShopCartItem · una línea del carrito (card de la maqueta): imagen, categoría y título, marca, referencia, cantidad, precios y quitar
// conecta con: shop.cart.thunks (cambiar cantidad y quitar en el backend), shop.helpers (título y «marca - modelo»), brand/ProductBrand (marca), useCartQuantity (cantidad editable); la pinta ShopCartDrawer por cada item
// ojo: antes la cantidad se cambiaba con - y +; ahora es un campo numérico como el de la maqueta. El nivel de precio (si se conoce) va al final de la línea de marca y modelo
import React from 'react'
import { formatPesos } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { removeCartItemThunk } from '../../thunks/shop.cart.update.thunks'
import { selectCartMutating } from '../../selectors/shop.selectors'
import { getBrandModelLabel, getProductTitle } from '../../helpers/shop.helpers'
import { useCartQuantity } from '../../hooks/useCartQuantity'
import type { ShopCartItemProps } from '../../types/shop.cart.types'
import { ProductBrand } from '../brand/ProductBrand'
import { TrashIcon } from '../icons/ShopIcons'
import './ShopCartItem.css'

export const ShopCartItem: React.FC<ShopCartItemProps> = ({ item }) => {
  const dispatch = useAppDispatch()
  // mientras el backend procesa un cambio se bloquean los controles (evita dobles clics)
  const isBusy = useAppSelector(selectCartMutating)
  const quantity = useCartQuantity(item.cartId, item.quantity)
  const { product } = item
  const title = getProductTitle(product)

  return (
    <li className="shop-cart-item">
      <div className="shop-cart-item-slot">
        {product.imageUrl && <img className="shop-cart-item-image" src={product.imageUrl} alt="" loading="lazy" />}
      </div>

      <div className="shop-cart-item-main">
        <div className="shop-cart-item-top">
          <div className="shop-cart-item-title">
            {product.category && <span className="shop-cart-item-category">{product.category}</span>}
            <strong className="shop-cart-item-name" title={title}>
              {title.toUpperCase()}
            </strong>
          </div>
          <ProductBrand name={product.brand} image={product.brandImage} size="cart" />
        </div>

        <span className="shop-cart-item-meta">
          {getBrandModelLabel(product)}
          {item.priceLevel && ` · ${item.priceLevel}`}
        </span>
        <span className="shop-cart-item-ref">{product.code}</span>

        <div className="shop-cart-item-foot">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="shop-cart-item-qty"
            value={quantity.text}
            disabled={isBusy}
            aria-label={`Cantidad de ${title}`}
            onChange={(e) => quantity.handleChange(e.target.value)}
            onBlur={quantity.handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />

          {/* Precio por unidad | subtotal de la línea */}
          <div className="shop-cart-item-prices">
            <span>{formatPesos(item.selectedPrice)}</span>
            <span className="shop-cart-item-prices-sep">|</span>
            <span>{formatPesos(item.subtotal)}</span>
          </div>

          <button
            type="button"
            onClick={() => dispatch(removeCartItemThunk(item.cartId))}
            disabled={isBusy}
            className="shop-cart-item-remove-btn"
            title="Eliminar del carrito"
            aria-label={`Eliminar ${title} del carrito`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  )
}

export default ShopCartItem
