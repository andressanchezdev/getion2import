// ProductCardTierMenu · icono de etiqueta junto al precio; abre el menú de las 4 tarifas (P0 - P3) con su precio y muestra el nivel activo
// conecta con: ProductCardPricing (nivel y cambio de nivel); global useClickOutside (cierra con clic fuera o Escape); PRICE_LEVEL_OPTIONS de shop.constants
import React, { useCallback, useRef, useState } from 'react'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useClickOutside } from '@/global/hooks/ui/useClickOutside'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { getAvailableLevels, getPriceByLevel } from '../../../helpers/shop.helpers'
import { PRICE_LEVEL_OPTIONS } from '../../../constants/shop.constants'
import type { ProductCardTierMenuProps } from '../../../types/shop.card.types'
import { TagIcon } from '../icons/ProductCardIcons'
import './ProductCardTierMenu.css'

export const ProductCardTierMenu: React.FC<ProductCardTierMenuProps> = ({ product, level, onLevelChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setIsOpen(false), [])
    // el menú lista siempre las 4 tarifas para ver la tabla de precios completa; solo se pueden elegir las que el producto tiene con precio
    // ojo: antes el icono se bloqueaba si el producto tenía una sola tarifa (en los datos semilla todos tienen solo P1) y no abría nunca
    const available = getAvailableLevels(product)
    // abrir y elegir la tarifa es del empleado con permiso de ventas (lo decide él, a su criterio); sin ese permiso solo ve la tarifa activa
    const canChange = usePermissions().canPerformAction('shop', 'orders', 'create')
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
                onClick={() => canChange && setIsOpen((prev) => !prev)}
                disabled={!canChange}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`Tarifa activa ${level}. Cambiar tarifa`}
                title={canChange ? 'Ver y cambiar tarifa' : 'Elegir la tarifa es de quien tiene permiso de ventas'}
            >
                <TagIcon />
                <span className="product-card-tier-badge">{level}</span>
            </button>

            {isOpen && canChange && (
                <div className="product-card-tier-menu" role="menu">
                    {PRICE_LEVEL_OPTIONS.map(({ key }) => {
                        const hasPrice = available.includes(key)
                        return (
                            <button
                                key={key}
                                type="button"
                                role="menuitemradio"
                                aria-checked={level === key}
                                disabled={!hasPrice}
                                className={`product-card-tier-option ${level === key ? 'product-card-tier-option-active' : ''}`}
                                onClick={() => handleSelect(key)}
                            >
                                <span>{key}</span>
                                {hasPrice ? <b>{formatCOP(getPriceByLevel(product, key))}</b> : <span className="product-card-tier-option-empty">Sin precio</span>}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ProductCardTierMenu
