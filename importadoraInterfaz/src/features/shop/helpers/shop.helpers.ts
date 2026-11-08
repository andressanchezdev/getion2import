// shop.helpers · funciones puras de la tienda (stock, precio por nivel y emoji de categoría)
// conecta con: ProductCard (los usa para pintar) y shop.selectors
// ojo: estas funciones antes estaban dentro de ProductCard.tsx
import type { CartItem, PriceLevelKey, Product, ProductStockStatus } from '../types/shop.types'
import { IVA_RATE, PRICE_LEVEL_OPTIONS } from '../constants/shop.constants'

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
export { toWarehouseNumber } from '@/global/helpers/warehouse/warehouse'

// precio del producto según el nivel activo (P0 mostrador ... P3 mayorista)
export const getPriceByLevel = (product: Product, level: PriceLevelKey): number => {
  const key = level.toLowerCase() as keyof Product['prices']
  return product.prices[key]
}

// niveles de precio que el producto realmente tiene en la tabla de precios (precio mayor que 0); los demás no se pueden elegir
export const getAvailableLevels = (product: Product): PriceLevelKey[] =>
  PRICE_LEVEL_OPTIONS.map((option) => option.key).filter((key) => getPriceByLevel(product, key) > 0)

// el nivel que se aplica: el pedido si el producto tiene precio en él; si no, el primer nivel que sí tiene (evita ofrecer o cobrar $0)
export const resolvePriceLevel = (product: Product, requested: PriceLevelKey): PriceLevelKey => {
  const available = getAvailableLevels(product)
  return available.includes(requested) ? requested : (available[0] ?? requested)
}

// título de la card y del carrito: la descripción; si falta o solo repite el modelo se muestra el modelo; sin ninguno, el código
export const getProductTitle = (product: Product): string => {
  const description = (product.description ?? '').trim()
  const model = (product.modelCompatible ?? '').trim()
  if (description && description.toUpperCase() !== model.toUpperCase()) return description
  return model || product.name || product.code
}

// lo que sigue a la descripción en el nombre: «ANILLOS PULSAR 135» con descripción «ANILLOS» deja «PULSAR 135» ('' si el nombre no empieza por la descripción)
const nameRemainder = (product: Product): string => {
  const description = (product.description ?? '').trim()
  const name = (product.name ?? '').trim()
  if (!description || name.length <= description.length) return ''
  return name.toUpperCase().startsWith(description.toUpperCase()) ? name.slice(description.length).trim() : ''
}

// detalle de la card: el modelo (o la referencia técnica, ej. 15W40); si el producto no lo trae sale de lo que sigue a la descripción en el nombre
export const getProductDetail = (product: Product): string => (product.modelCompatible ?? '').trim() || nameRemainder(product)

// línea gris «MARCA - MODELO» de la card y del carrito (sin sobrantes si falta uno de los dos)
export const getBrandModelLabel = (product: Product): string =>
  [product.brand, getProductDetail(product)].filter(Boolean).join(' - ')

// resumen del carrito para compartir (WhatsApp, correo...): una línea por producto y el total
export const buildCartShareText = (items: CartItem[], total: number): string =>
  [
    'Mi carrito:',
    ...items.map((item) => `• ${getFullTitle(item.product)} x${item.quantity} — $${Math.round(item.subtotal).toLocaleString('es-CO')}`),
    `Total: $${Math.round(total).toLocaleString('es-CO')}`,
  ].join('\n')

// nombre completo para el carrito: la descripción y su detalle en una sola línea («ACEITE 15W40»)
export const getFullTitle = (product: Product): string => {
  const title = getProductTitle(product)
  const detail = getProductDetail(product)
  return detail && detail.toUpperCase() !== title.toUpperCase() ? `${title} ${detail}` : title
}

// separa un total con IVA incluido en subtotal e IVA (el subtotal se redondea al peso y el IVA es lo que falta, así siempre suman el total)
export const splitIncludedTax = (total: number, rate: number = IVA_RATE): { subtotal: number; tax: number } => {
  const subtotal = Math.round(total / (1 + rate))
  return { subtotal, tax: total - subtotal }
}

// ojo: toApiPriceTier (P0..P3 → p1..p4) se movió a global/helpers/priceTier (también la usa customers); se re-exporta para no cambiar los imports de shop
export { toApiPriceTier } from '@/global/helpers/pricing/priceTier'

// los renglones del carrito como los pide POST /sales: ubicación (stockId), cantidad y precio unitario; un renglón sin ubicación no se puede vender
export const toSaleLines = (items: CartItem[]): { stockId: number; quantity: number; unitPrice: number }[] =>
  items.flatMap((item) => (item.stockId ? [{ stockId: item.stockId, quantity: item.quantity, unitPrice: item.selectedPrice }] : []))
