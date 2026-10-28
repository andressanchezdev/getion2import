// ProductCard · tarjeta de producto con el diseño de la maqueta (IP): imagen con tarifas, precio y marca, categoría y título, referencia y cantidad
// conecta con: ShopCatalogScreen (le pasa los datos y recibe el agregar al carrito); usa shop.helpers y las partes ProductCard* (parts/ Media, Info, TierMenu) y brand/ProductBrand
// ojo: antes tenía el diseño de Yamaha (borde #e9e7e7, botón en mayúsculas con fuente Oswald, contador con - y +); ahora es el de la maqueta. ProductCardStock no se usa en la tarjeta (el stock salió del diseño); el archivo se conserva como referencia
// ojo: la tarjeta no abre ningún detalle del producto: el producto solo se ve aquí, en el carrito y en las tablas
import React, { useState } from 'react'
import type { PriceLevelKey } from '../../types/shop.types'
import type { ProductCardProps } from '../../types/shop.card.types'
import { getBrandModelLabel, getProductTitle, getStockStatus, getWarehouseStock } from '../../helpers/shop.helpers'
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

    // ojo: la cantidad (número escrito o flechas del campo) vive en useQuantityInput; antes eran useState + handleIncrement/Decrement aquí
    const quantityInput = useQuantityInput(warehouseStock)

    const handleAdd = () => {
        if (isOutOfStock || cartQuantity > 0) return
        // si el usuario estaba escribiendo, se confirma ese número antes de agregar
        onAddToCart(product, quantityInput.commitDraft(), cardPriceLevel)
    }

    return (
        <article className="product-card">
            <ProductCardMedia
                name={product.name}
                category={product.category}
                imageUrl={product.imageUrl}
                product={product}
                level={cardPriceLevel}
                onLevelChange={(level) => setPriceOverride({ level, from: selectedPriceLevel })}
            />

            <div className="product-card-body">
                {/* Precio del nivel activo a la izquierda y la marca a la derecha */}
                <ProductCardPricing product={product} level={cardPriceLevel} />

                <ProductCardInfo
                    category={product.category}
                    title={getProductTitle(product)}
                    meta={getBrandModelLabel(product)}
                    code={product.code}
                    location={product.location}
                />

                {/* Cantidad + botón Ordenar */}
                <ProductCardActions
                    quantityText={quantityInput.text}
                    maxQuantity={warehouseStock}
                    isOutOfStock={isOutOfStock}
                    cartQuantity={cartQuantity}
                    onQuantityChange={quantityInput.handleChange}
                    onQuantityBlur={quantityInput.handleBlur}
                    onAdd={handleAdd}
                />
            </div>
        </article>
    )
}

export default ProductCard
