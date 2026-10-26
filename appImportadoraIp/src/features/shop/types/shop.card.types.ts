// shop.card.types · props de la tarjeta de producto y de sus partes (stock, precios y acciones)
// conecta con: ProductCard, ProductCardStock, ProductCardPricing, ProductCardActions y las partes (Media, Info, TierMenu)
// ojo: ProductCardProps antes estaba en shop.types; se separó para que ese archivo no crezca
import type { KeyboardEvent } from 'react'
import type { PriceLevelKey, Product, ProductStockStatus } from './shop.types'

export interface ProductCardProps {
    product: Product
    activeWarehouseId: string
    selectedPriceLevel: PriceLevelKey
    cartQuantity?: number
    onAddToCart: (product: Product, quantity: number, priceLevel: PriceLevelKey) => void
}

export interface ProductCardStockProps {
    status: ProductStockStatus
    stock: number
}

export interface ProductCardPricingProps {
    product: Product
    level: PriceLevelKey
}

export interface ProductCardActionsProps {
    quantity: number // cantidad confirmada (la usan los botones - y + para deshabilitarse)
    quantityText: string // lo que se ve en el campo (puede ser lo que el usuario está escribiendo)
    maxQuantity: number
    isOutOfStock: boolean
    cartQuantity: number
    onIncrement: () => void
    onDecrement: () => void
    onQuantityChange: (value: string) => void
    onQuantityKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
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

export interface ProductCardInfoProps {
    name: string
    code: string
    location?: string
}

export interface ProductCardTierMenuProps {
    product: Product
    level: PriceLevelKey
    onLevelChange: (level: PriceLevelKey) => void
}
