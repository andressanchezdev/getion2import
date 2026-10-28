// ProductBrand · marca del producto: su logo (si llegó la imagen y carga) o, si no, el nombre en cursiva y negrita
// conecta con: ProductCardPricing (card del catálogo) y ShopCartItem (línea del carrito); la imagen sale de Product.brandImage
// ojo: si la imagen del logo falla se muestra el nombre, así la card nunca queda sin marca
import React, { useState } from 'react'
import './ProductBrand.css'

interface ProductBrandProps {
    name: string
    image?: string
    size?: 'card' | 'cart'
}

export const ProductBrand: React.FC<ProductBrandProps> = ({ name, image, size = 'card' }) => {
    const [failedImage, setFailedImage] = useState<string | null>(null)
    const showImage = Boolean(image) && failedImage !== image

    if (!name && !showImage) return null

    return (
        <span className={`product-brand product-brand-${size}`}>
            {showImage ? (
                <img
                    className="product-brand-image"
                    src={image}
                    alt={name}
                    loading="lazy"
                    onError={() => setFailedImage(image ?? null)}
                />
            ) : (
                <b className="product-brand-name">{name}</b>
            )}
        </span>
    )
}

export default ProductBrand
