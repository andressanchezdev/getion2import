// ProductCardInfo · nombre del repuesto, referencia (código) y, en otra línea, la ubicación en estantería
// conecta con: ProductCard (le pasa los datos)
import React from 'react'
import type { ProductCardInfoProps } from '../../../types/shop.card.types'
import { PinIcon } from './ProductCardIcons'
import './ProductCardInfo.css'

export const ProductCardInfo: React.FC<ProductCardInfoProps> = ({ name, code, location }) => {
    return (
        <div className="product-card-info">
            <h3 className="product-card-name" title={name}>
                <span>{name}</span>
            </h3>

            <p className="product-card-ref">
                <span>Ref</span>
                <span>:</span>
                <span>{code}</span>
            </p>
            {/* ojo: la ubicación ahora va en su propia línea (antes iba junto a la referencia y se partía en dos al faltar ancho) */}
            {location && (
                <p className="product-card-location" title="Ubicación física en estantería">
                    <PinIcon />
                    {location}
                </p>
            )}
        </div>
    )
}

export default ProductCardInfo
