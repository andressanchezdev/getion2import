// ProductCardPricing · precio del nivel activo alineado a la derecha
// conecta con: ProductCard (nivel del producto); formato COP de global/helpers/format
import React from 'react'
import { formatCOP } from '@/global/helpers/format'
import { getPriceByLevel } from '../../helpers/shop.helpers'
import type { ProductCardPricingProps } from '../../types/shop.card.types'
import './ProductCardPricing.css'

export const ProductCardPricing: React.FC<ProductCardPricingProps> = ({ product, level }) => {
    return (
        <div className="product-card-pricing">
            <span className="product-card-price-main">{formatCOP(getPriceByLevel(product, level))}</span>
        </div>
    )
}

export default ProductCardPricing
