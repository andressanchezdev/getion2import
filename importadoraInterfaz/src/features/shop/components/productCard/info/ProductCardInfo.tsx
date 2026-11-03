// ProductCardInfo · tres filas del repuesto: título con su detalle, línea «MARCA - MODELO» (con la ubicación en estantería a la derecha) y la referencia
// conecta con: ProductCard (le pasa los datos ya armados con shop.helpers); global toast (aviso al copiar la referencia)
// ojo: la ubicación en estantería es un dato de la v2.3 que la maqueta no tiene: va en la fila de marca y modelo (que ya reparte dos extremos) para no sumar una línea nueva a la card
// ojo: la referencia se copia con un clic (como en la maqueta) y avisa con una alerta flotante
import React from 'react'
import { toast } from '@/global/helpers/feedback/toast'
import type { ProductCardInfoProps } from '../../../types/shop.card.types'
import { PinIcon } from '../icons/ProductCardIcons'
import './ProductCardInfo.css'

export const ProductCardInfo: React.FC<ProductCardInfoProps> = ({ title, detail, meta, code, location }) => {
    // copia la referencia al portapapeles; si el navegador no lo permite solo avisa
    const handleCopy = () => {
        navigator.clipboard?.writeText(code).catch(() => undefined)
        toast.success(`Referencia copiada: ${code}`)
    }

    return (
        <>
            <div className="product-card-desc">
                <h3 className="product-card-title" title={title}>
                    {title.toUpperCase()}
                </h3>
                {detail && detail.toUpperCase() !== title.toUpperCase() && <span className="product-card-detail">{detail.toUpperCase()}</span>}
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
