// ProductCardStock · disponibilidad de stock de la tarjeta (agotado, bajo o disponible)
// conecta con: ProductCard (le pasa el estado y la cantidad); el estado sale de shop.helpers (getStockStatus)
import React from 'react'
import type { ProductCardStockProps } from '../../types/shop.card.types'
import './ProductCardStock.css'

export const ProductCardStock: React.FC<ProductCardStockProps> = ({ status, stock }) => {
    return (
        <div className="product-card-stock-row">
            {status === 'out_of_stock' ? (
                <span className="product-card-stock-badge product-card-stock-out">
                    <span className="product-card-stock-dot" />
                    Agotado en bodega
                </span>
            ) : status === 'low_stock' ? (
                <span className="product-card-stock-badge product-card-stock-low">
                    <span className="product-card-stock-dot" />
                    ¡Bajo stock! ({stock} unid.)
                </span>
            ) : (
                <span className="product-card-stock-badge product-card-stock-in">
                    <span className="product-card-stock-dot" />
                    Disponible: {stock} unid.
                </span>
            )}
        </div>
    )
}

export default ProductCardStock
