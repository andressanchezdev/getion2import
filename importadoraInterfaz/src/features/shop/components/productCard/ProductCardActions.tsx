// ProductCardActions · cantidad y botón de ordenar de la tarjeta (Ordenar, Ordenado o Agotado)
// conecta con: ProductCard (cantidad y acciones, que salen del hook useQuantityInput); no guarda estado, todo llega por props
// ojo: como en la maqueta la cantidad es un campo numérico (las flechas del navegador suben y bajan, Enter ordena) y, una vez ordenado o agotado, el campo se oculta y el botón queda inactivo; la cantidad se cambia desde el carrito
import React from 'react'
import type { ProductCardActionsProps } from '../../types/shop.card.types'
import './ProductCardActions.css'

export const ProductCardActions: React.FC<ProductCardActionsProps> = ({
    quantityText,
    maxQuantity,
    isOutOfStock,
    cartQuantity,
    onQuantityChange,
    onQuantityBlur,
    onAdd,
}) => {
    const isOrdered = cartQuantity > 0
    const canOrder = !isOutOfStock && !isOrdered
    const label = isOutOfStock ? 'Agotado' : isOrdered ? 'Ordenado' : 'Ordenar'

    return (
        <div className="product-card-action-row">
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, maxQuantity)}
                className={`product-card-qty ${canOrder ? '' : 'product-card-qty-hidden'}`}
                value={quantityText}
                disabled={!canOrder}
                tabIndex={canOrder ? 0 : -1}
                title={`Disponibles: ${maxQuantity}`}
                aria-label={`Cantidad a ordenar (máximo ${maxQuantity})`}
                onChange={(e) => onQuantityChange(e.target.value)}
                onBlur={onQuantityBlur}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    onAdd()
                }}
            />

            <button
                type="button"
                className={`product-card-btn-add-to-cart ${isOutOfStock ? 'product-card-btn-off' : isOrdered ? 'product-card-already-ordered' : ''}`}
                onClick={onAdd}
                disabled={!canOrder}
                aria-label={isOrdered ? `Ordenado: ${cartQuantity} en el carrito` : label}
            >
                {label}
            </button>
        </div>
    )
}

export default ProductCardActions
