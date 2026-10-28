// ProductCardPricing · fila del precio del nivel activo (izquierda) y la marca del producto (derecha)
// conecta con: ProductCard (nivel del producto); formato de pesos de global/helpers/format; ProductBrand (logo o nombre de la marca)
// ojo: antes el precio iba solo alineado a la derecha; como en la maqueta ahora comparte la fila con la marca
import React from 'react'
import { formatPesos } from '@/global/helpers/format'
import { getPriceByLevel } from '../../helpers/shop.helpers'
import type { ProductCardPricingProps } from '../../types/shop.card.types'
import { ProductBrand } from '../brand/ProductBrand'
import './ProductCardPricing.css'

export const ProductCardPricing: React.FC<ProductCardPricingProps> = ({ product, level }) => {
    return (
        <div className="product-card-pricing">
            <span className="product-card-price-main">{formatPesos(getPriceByLevel(product, level))}</span>
            <ProductBrand name={product.brand} image={product.brandImage} />
        </div>
    )
}

export default ProductCardPricing
