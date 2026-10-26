// ProductCardActions · contador de cantidad y botón de ordenar de la tarjeta
// conecta con: ProductCard (cantidad y acciones, que salen del hook useQuantityInput); no guarda estado, todo llega por props
// ojo: el número del contador ahora es un campo editable (clic selecciona, flechas del teclado suben y bajan, Enter ordena); el stock disponible queda en su title; "Ordenado" muestra "Cantidad: N" en una segunda línea
import React from 'react'
import type { ProductCardActionsProps } from '../../types/shop.card.types'
import './ProductCardActions.css'

export const ProductCardActions: React.FC<ProductCardActionsProps> = ({
    quantity,
    quantityText,
    maxQuantity,
    isOutOfStock,
    cartQuantity,
    onIncrement,
    onDecrement,
    onQuantityChange,
    onQuantityKeyDown,
    onQuantityBlur,
    onAdd,
}) => {
    const isOrdered = cartQuantity > 0

    return (
        <div className="product-card-action-row">
            <div className="product-card-quantity-stepper">
                <button
                    type="button"
                    className="product-card-stepper-btn"
                    onClick={onDecrement}
                    disabled={isOutOfStock || quantity <= 1}
                    aria-label="Disminuir cantidad"
                >
                    -
                </button>
                {/* campo editable: al hacer clic o entrar con Tab se selecciona el número para escribir encima;
                    flechas arriba/abajo suman o restan 1 y Enter agrega al carrito */}
                <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="product-card-stepper-count"
                    value={isOutOfStock ? '0' : quantityText}
                    disabled={isOutOfStock}
                    title={`Disponibles: ${maxQuantity}`}
                    aria-label={`Cantidad seleccionada (máximo ${maxQuantity})`}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            onAdd()
                            return
                        }
                        onQuantityKeyDown(e)
                    }}
                    onBlur={onQuantityBlur}
                />
                <button
                    type="button"
                    className="product-card-stepper-btn"
                    onClick={onIncrement}
                    disabled={isOutOfStock || quantity >= maxQuantity}
                    aria-label="Aumentar cantidad"
                >
                    +
                </button>
            </div>

            <button
                type="button"
                className={`product-card-btn-add-to-cart ${isOrdered ? 'product-card-already-ordered' : ''}`}
                onClick={onAdd}
                disabled={isOutOfStock}
            >
                {isOutOfStock ? (
                    <span className="product-card-btn-label">Sin stock</span>
                ) : isOrdered ? (
                    <>
                        <span className="product-card-btn-label">Ordenado</span>
                        <small className="product-card-btn-note">Cantidad: {cartQuantity}</small>
                    </>
                ) : (
                    <span className="product-card-btn-label">+ Ordenar</span>
                )}
            </button>
        </div>
    )
}

export default ProductCardActions
