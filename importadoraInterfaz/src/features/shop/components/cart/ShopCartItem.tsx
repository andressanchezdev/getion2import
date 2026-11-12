// ShopCartItem · una línea del carrito (card de la maqueta): imagen, categoría y título, marca, referencia, cantidad, precios y quitar
// conecta con: shop.cart.thunks (cambiar cantidad y quitar en el backend), shop.helpers (título y «marca - modelo»), brand/ProductBrand (marca), useCartQuantity (cantidad editable); la pinta ShopCartDrawer por cada item
// ojo: antes la cantidad se cambiaba con - y +; ahora es un campo numérico como el de la maqueta. El nivel de precio (si se conoce) va al final de la línea de marca y modelo
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { removeCartItemThunk } from '../../thunks/shop.cart.update.thunks'
import { selectCartMutating } from '../../selectors/shop.selectors'
import { getBrandModelLabel, getFullTitle, getWarehouseStock } from '../../helpers/shop.helpers'
import { useCartQuantity } from '../../hooks/useCartQuantity'
import type { ShopCartItemProps } from '../../types/shop.cart.types'
import { ProductBrand } from '../brand/ProductBrand'
import { TrashIcon } from '../icons/ShopIcons'
import './ShopCartItem.css'

export const ShopCartItem: React.FC<ShopCartItemProps> = ({ item }) => {
  const dispatch = useAppDispatch()
  // mientras el backend procesa un cambio se bloquean los controles (evita dobles clics)
  const isBusy = useAppSelector(selectCartMutating)
  const { product } = item
  const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  // tope: lo vendible de la bodega activa según el catálogo cargado (si el producto no está en la página cargada no se limita aquí)
  const catalogProduct = useAppSelector((state) => state.products.items.find((candidate) => candidate.id === item.productId))
  const maxQuantity = item.maxAvailable ?? (catalogProduct ? getWarehouseStock(catalogProduct, activeWarehouseId) : undefined)
  const quantity = useCartQuantity(item.cartId, item.quantity, maxQuantity)
  const title = getFullTitle(product)
  const isUnavailable = Boolean(item.unavailable || product.status === 'inactive')
  const exceedsStock = !isUnavailable && maxQuantity !== undefined && item.quantity > maxQuantity

  return (
    <li className={`shop-cart-item${isUnavailable || exceedsStock ? ' shop-cart-item--warning' : ''}`}>
      <div className="shop-cart-item-slot">
        {product.imageUrl && <img className="shop-cart-item-image" src={product.imageUrl} alt="" loading="lazy" />}
      </div>

      <div className="shop-cart-item-main">
        <div className="shop-cart-item-top">
          <div className="shop-cart-item-title">
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
        {isUnavailable && <span className="shop-cart-item-alert">Producto no disponible</span>}
        {exceedsStock && <span className="shop-cart-item-alert">Quedan {maxQuantity} disponibles</span>}

        <div className="shop-cart-item-foot">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity && maxQuantity > 0 ? maxQuantity : undefined}
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
