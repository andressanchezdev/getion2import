// ProductCardTierMenu · icono de etiqueta junto al precio; abre el menú de tarifas P0 - P3 y muestra el nivel activo
// conecta con: ProductCardPricing (nivel y cambio de nivel); global useClickOutside (cierra con clic fuera o Escape); PRICE_LEVEL_OPTIONS de shop.constants
import React, { useCallback, useRef, useState } from 'react'
import { formatCOP } from '@/global/helpers/format'
import { useClickOutside } from '@/global/hooks/useClickOutside'
import { getPriceByLevel } from '../../../helpers/shop.helpers'
import { PRICE_LEVEL_OPTIONS } from '../../../constants/shop.constants'
import type { ProductCardTierMenuProps } from '../../../types/shop.card.types'
import { TagIcon } from './ProductCardIcons'
import './ProductCardTierMenu.css'

export const ProductCardTierMenu: React.FC<ProductCardTierMenuProps> = ({ product, level, onLevelChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setIsOpen(false), [])
    useClickOutside(wrapperRef, close, isOpen)

    // elige una tarifa y cierra el menú
    const handleSelect = (key: ProductCardTierMenuProps['level']) => {
        onLevelChange(key)
        close()
    }

    return (
        <div className="product-card-tier" ref={wrapperRef}>
            <button
                type="button"
                className={`product-card-tier-trigger ${isOpen ? 'product-card-tier-trigger-open' : ''}`}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`Tarifa activa ${level}. Cambiar tarifa`}
                title="Cambiar tarifa"
            >
                <TagIcon />
                <span className="product-card-tier-badge">{level}</span>
            </button>

            {isOpen && (
                <div className="product-card-tier-menu" role="menu">
                    {PRICE_LEVEL_OPTIONS.map(({ key }) => (
                        <button
                            key={key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={level === key}
                            className={`product-card-tier-option ${level === key ? 'product-card-tier-option-active' : ''}`}
                            onClick={() => handleSelect(key)}
                        >
                            <span>{key}</span>
                            <b>{formatCOP(getPriceByLevel(product, key))}</b>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ProductCardTierMenu
