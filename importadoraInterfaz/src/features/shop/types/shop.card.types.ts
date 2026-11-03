// shop.card.types · props de la tarjeta de producto y de sus partes (stock, precios y acciones)
// conecta con: ProductCard, ProductCardStock, ProductCardPricing, ProductCardActions y las partes (Media, Info, TierMenu)
// ojo: ProductCardProps antes estaba en shop.types; se separó para que ese archivo no crezca
import type { PriceLevelKey, Product } from './shop.types'

export interface ProductCardProps {
    product: Product
    activeWarehouseId: string
    selectedPriceLevel: PriceLevelKey
    cartQuantity?: number
    onAddToCart: (product: Product, quantity: number, priceLevel: PriceLevelKey) => void
}

export interface ProductCardStockProps {
    stock: number // lo que queda en la bodega activa (se lee en el tooltip del ícono)
}

export interface ProductCardPricingProps {
    product: Product
    level: PriceLevelKey
}

// ojo: la cantidad ahora es un campo numérico como el de la maqueta (las flechas del navegador suben y bajan), por eso ya no hay botones - y +
export interface ProductCardActionsProps {
    quantityText: string // lo que se ve en el campo (puede ser lo que el usuario está escribiendo)
    maxQuantity: number
    isOutOfStock: boolean
    noPrice?: boolean // el producto no tiene ningún precio en la tabla de precios: no se puede ordenar
    cartQuantity: number
    lowStockQuantity?: number // lo que queda cuando el producto está en bajo stock en la bodega activa; sin valor no se muestra el ícono de advertencia
    onQuantityChange: (value: string) => void
    onQuantityBlur: () => void
    onAdd: () => void
}

// ojo: props de la imagen con el menú de tarifas P0 - P3 flotante en la esquina superior
export interface ProductCardMediaProps {
    name: string
    category: string
    imageUrl?: string
    product: Product
    level: PriceLevelKey
    onLevelChange: (level: PriceLevelKey) => void
}

// ojo: la card solo avisa el bajo stock con un ícono de advertencia junto al contador de cantidad (ProductCardStock, dentro de ProductCardActions); el agotado se ve en el botón «Agotado» y no lleva aviso aparte
// ojo: la info de la card son tres filas como en importadora-online: título con su detalle («ACEITE 15W40»), «MARCA - MODELO» (con la ubicación a la derecha) y la referencia; la categoría ya no se muestra (todos los productos comparten una)
export interface ProductCardInfoProps {
    title: string // descripción o modelo (getProductTitle)
    detail?: string // modelo o referencia técnica al lado del título (getProductDetail)
    meta: string // «MARCA - MODELO» (getBrandModelLabel)
    code: string
    location?: string
}

export interface ProductCardTierMenuProps {
    product: Product
    level: PriceLevelKey
    onLevelChange: (level: PriceLevelKey) => void
}
