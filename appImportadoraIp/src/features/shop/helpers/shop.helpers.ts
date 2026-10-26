// shop.helpers · funciones puras de la tienda (stock, precio por nivel y emoji de categoría)
// conecta con: ProductCard (los usa para pintar) y shop.selectors
// ojo: estas funciones antes estaban dentro de ProductCard.tsx
import type { PriceLevelKey, Product, ProductStockStatus } from '../types/shop.types'

// stock de un producto en una bodega (0 si no hay dato de esa bodega)
export const getWarehouseStock = (product: Product, warehouseId: string): number => {
  return product.stockByWarehouse[warehouseId] ?? 0
}

// estado del stock: agotado, bajo (<= alerta mínima, 5 por defecto) o disponible
export const getStockStatus = (stock: number, minAlert: number = 5): ProductStockStatus => {
  if (stock <= 0) return 'out_of_stock'
  if (stock <= minAlert) return 'low_stock'
  return 'in_stock'
}

// deja la cantidad entre 1 y el stock disponible (redondea hacia abajo; si no es un número válido queda en 1; sin stock es 0)
export const clampQuantity = (value: number, max: number): number => {
  if (max <= 0) return 0
  if (!Number.isFinite(value)) return 1
  return Math.min(Math.max(1, Math.floor(value)), max)
}

// identificador nuevo para el carrito de una venta (el backend agrupa las líneas del carrito por este uuid)
export const createCartUuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

// ojo: toWarehouseNumber se movió a global/helpers/warehouse (también la usa wallet); se re-exporta para no cambiar los imports de shop
export { toWarehouseNumber } from '@/global/helpers/warehouse'

// precio del producto según el nivel activo (P0 mostrador ... P3 mayorista)
export const getPriceByLevel = (product: Product, level: PriceLevelKey): number => {
  const key = level.toLowerCase() as keyof Product['prices']
  return product.prices[key]
}

// emoji según la categoría, para enriquecer el thumbnail de la tarjeta
export const getCategoryEmoji = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'motor':
      return '⚙️'
    case 'frenos':
      return '🛑'
    case 'transmisión':
      return '⛓️'
    case 'eléctrico':
      return '⚡'
    case 'suspensión':
      return '🔩'
    default:
      return '📦'
  }
}
