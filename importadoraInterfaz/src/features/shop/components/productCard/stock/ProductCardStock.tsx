// ProductCardStock · ícono de advertencia de bajo stock de la tarjeta (triángulo amarillo); lo que queda se lee al pasar el cursor y en su nombre accesible
// conecta con: ProductCardActions (lo pinta junto al contador de cantidad, a la altura del botón de ordenar, solo cuando el estado es «bajo»; el estado sale de shop.helpers, getStockStatus)
// ojo: el agotado ya no lleva aviso en la tarjeta: se ve en el botón gris «Agotado» (ProductCardActions); el disponible tampoco lleva aviso
import React from 'react'
import type { ProductCardStockProps } from '../../../types/shop.card.types'
import './ProductCardStock.css'

const WarningTriangleIcon: React.FC = () => (
    <svg
        className="product-card-warning-icon"
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
    >
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
)

// ícono de advertencia de bajo stock; lo que queda se lee en su tooltip
export const ProductCardStock: React.FC<ProductCardStockProps> = ({ stock }) => {
    const detail = `Bajo stock: quedan ${stock} ${stock === 1 ? 'unidad' : 'unidades'}`
    return (
        <span className="product-card-stock-alert" role="img" tabIndex={0} aria-label={detail} title={detail}>
            <WarningTriangleIcon />
        </span>
    )
}

export default ProductCardStock
