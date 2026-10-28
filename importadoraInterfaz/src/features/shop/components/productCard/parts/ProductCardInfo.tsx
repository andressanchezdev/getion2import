// ProductCardInfo · categoría y título del repuesto, línea «MARCA - MODELO» (con la ubicación en estantería a la derecha) y la referencia
// conecta con: ProductCard (le pasa los datos ya armados con shop.helpers); global toast (aviso al copiar la referencia)
// ojo: la ubicación en estantería es un dato de la v2.3 que la maqueta no tiene: va en la fila de marca y modelo (que ya reparte dos extremos) para no sumar una línea nueva a la card
// ojo: la referencia se copia con un clic (como en la maqueta) y avisa con una alerta flotante
import React from 'react'
import { toast } from '@/global/helpers/toast'
import type { ProductCardInfoProps } from '../../../types/shop.card.types'
import { PinIcon } from './ProductCardIcons'
import './ProductCardInfo.css'

export const ProductCardInfo: React.FC<ProductCardInfoProps> = ({ category, title, meta, code, location }) => {
    // copia la referencia al portapapeles; si el navegador no lo permite solo avisa
    const handleCopy = () => {
        navigator.clipboard?.writeText(code).catch(() => undefined)
        toast.success(`Referencia copiada: ${code}`)
    }

    return (
        <>
            <div className="product-card-desc">
                {category && <p className="product-card-category">{category}</p>}
                <h3 className="product-card-title" title={title}>
                    {title.toUpperCase()}
                </h3>
            </div>

            <div className="product-card-meta">
                <span>{meta}</span>
                {location && (
                    <span className="product-card-location" title="Ubicación física en estantería">
                        <PinIcon />
                        {location}
                    </span>
                )}
            </div>

            <button type="button" className="product-card-ref" onClick={handleCopy} title="Clic para copiar la referencia">
                {code}
            </button>
        </>
    )
}

export default ProductCardInfo
