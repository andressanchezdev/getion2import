// ProductCardMedia · imagen del producto con el menú de tarifas flotante en la esquina superior derecha e indicadores de stock por bodega
// conecta con: ProductCard (le pasa los datos); ProductCardTierMenu (menú de tarifas); ProductCardWarehouseStock; Icon (paquete cuando no hay imagen)
import React, { useState } from 'react'
import type { ProductCardMediaProps } from '../../../types/shop.card.types'
import { Icon } from '@/global/components/UI/atoms/Icon'
import packageIcon from '@/assets/icons/package-alt-2-svgrepo-com.svg?raw'
import { ProductCardTierMenu } from '../tier/ProductCardTierMenu'
import { ProductCardWarehouseStock } from '../stock/ProductCardWarehouseStock'
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
            <div className="product-card-media-left-badges">
                {product.isNew && <span className="product-card-badge-new">Nuevo</span>}
                <ProductCardWarehouseStock product={product} />
            </div>

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
                    <Icon svg={packageIcon} size="xl" />
                </span>
            )}
        </div>
    )
}

export default ProductCardMedia
