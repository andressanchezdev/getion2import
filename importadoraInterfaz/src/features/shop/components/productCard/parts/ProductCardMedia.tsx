// ProductCardMedia · imagen del producto con el menú de tarifas flotante en la esquina superior derecha
// conecta con: ProductCard (le pasa los datos); ProductCardTierMenu (menú de tarifas); getCategoryEmoji de shop.helpers
import React, { useState } from 'react'
import type { ProductCardMediaProps } from '../../../types/shop.card.types'
import { getCategoryEmoji } from '../../../helpers/shop.helpers'
import { ProductCardTierMenu } from './ProductCardTierMenu'
import './ProductCardMedia.css'

export const ProductCardMedia: React.FC<ProductCardMediaProps> = ({
    name,
    category,
    imageUrl,
    product,
    level,
    onLevelChange,
}) => {
    const [hasError, setHasError] = useState(false)
    const [prevUrl, setPrevUrl] = useState(imageUrl)

    if (prevUrl !== imageUrl) {
        setPrevUrl(imageUrl)
        setHasError(false)
    }

    const canRenderImage = Boolean(imageUrl) && !hasError

    return (
        <div className="product-card-media">
            {product.isNew && <span className="product-card-badge-new">Nuevo</span>}

            <div className="product-card-floating-actions">
                <ProductCardTierMenu product={product} level={level} onLevelChange={onLevelChange} />
            </div>

            {canRenderImage ? (
                <img
                    className="product-card-image"
                    src={imageUrl}
                    alt={name}
                    loading="lazy"
                    onError={() => setHasError(true)}
                />
            ) : (
                <span className="product-card-emoji" role="img" aria-label={category}>
                    {getCategoryEmoji(category)}
                </span>
            )}
        </div>
    )
}

export default ProductCardMedia
