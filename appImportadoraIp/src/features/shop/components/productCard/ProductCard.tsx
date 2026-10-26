// ProductCard · tarjeta de producto con el diseño de Yamaha: imagen con iconos, nombre, referencia, precio con tarifas y cantidad
// conecta con: ShopCatalogScreen (le pasa los datos y recibe el agregar al carrito); usa shop.helpers y las partes ProductCard* (parts/ Media, Info, TierMenu)
// ojo: ProductCardStock ya no se usa en la tarjeta (el stock salió del diseño); el archivo se conserva como referencia
import React, { useState } from 'react'
import type { PriceLevelKey } from '../../types/shop.types'
import type { ProductCardProps } from '../../types/shop.card.types'
import { getStockStatus, getWarehouseStock } from '../../helpers/shop.helpers'
import { useQuantityInput } from '../../hooks/useQuantityInput'
import { ProductCardMedia } from './parts/ProductCardMedia'
import { ProductCardInfo } from './parts/ProductCardInfo'
import { ProductCardPricing } from './ProductCardPricing'
import { ProductCardActions } from './ProductCardActions'
import './ProductCard.css'

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    activeWarehouseId,
    selectedPriceLevel,
    cartQuantity = 0,
    onAddToCart,
}) => {
    // Nivel de precio local editable por tarjeta (por defecto el seleccionado globalmente)
    // ojo: antes se sincronizaba con un useEffect; ahora el cambio local solo vale mientras el nivel global no cambie
    const [priceOverride, setPriceOverride] = useState<{ level: PriceLevelKey; from: PriceLevelKey } | null>(null)
    const cardPriceLevel: PriceLevelKey =
        priceOverride && priceOverride.from === selectedPriceLevel ? priceOverride.level : selectedPriceLevel

    // Stock de la bodega activa
    const warehouseStock = getWarehouseStock(product, activeWarehouseId)
    const isOutOfStock = getStockStatus(warehouseStock, product.minStockAlert) === 'out_of_stock'

    // ojo: la cantidad (botones, número escrito y flechas del teclado) ahora vive en useQuantityInput; antes eran useState + handleIncrement/Decrement aquí
    const quantityInput = useQuantityInput(warehouseStock)

    const handleAdd = () => {
        if (isOutOfStock) return
        // si el usuario estaba escribiendo, se confirma ese número antes de agregar
        onAddToCart(product, quantityInput.commitDraft(), cardPriceLevel)
    }

    return (
        <article className={`product-card ${isOutOfStock ? 'product-card-out-of-stock' : ''}`}>
            <ProductCardMedia
                name={product.name}
                category={product.category}
                imageUrl={product.imageUrl}
                product={product}
                level={cardPriceLevel}
                onLevelChange={(level) => setPriceOverride({ level, from: selectedPriceLevel })}
            />

            <ProductCardInfo name={product.name} code={product.code} location={product.location} />

            {/* Precio del nivel activo alineado a la derecha */}
            <ProductCardPricing
                product={product}
                level={cardPriceLevel}
            />

            {/* Contador de cantidad + botón Ordenar */}
            <ProductCardActions
                quantity={quantityInput.quantity}
                quantityText={quantityInput.text}
                maxQuantity={warehouseStock}
                isOutOfStock={isOutOfStock}
                cartQuantity={cartQuantity}
                onIncrement={quantityInput.increment}
                onDecrement={quantityInput.decrement}
                onQuantityChange={quantityInput.handleChange}
                onQuantityKeyDown={quantityInput.handleKeyDown}
                onQuantityBlur={quantityInput.handleBlur}
                onAdd={handleAdd}
            />
        </article>
    )
}

export default ProductCard
