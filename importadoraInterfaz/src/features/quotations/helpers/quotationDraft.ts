// quotationDraft · arma un renglón de la cotización a partir del producto del catálogo, su cantidad y el nivel de precio elegido
// conecta con: QuotationCatalogScreen (lo usa al agregar) y shop.helpers (precio por nivel, título y «marca - modelo»); con pruebas en quotationDraft.test.ts
import { getBrandModelLabel, getFullTitle, getPriceByLevel, type PriceLevelKey, type Product } from '@/features/shop'
import type { QuotationDraftLine } from '../types/quotations.types'

export const toDraftLine = (product: Product, quantity: number, level: PriceLevelKey): QuotationDraftLine => ({
  productId: Number(product.id),
  code: product.code,
  name: getFullTitle(product),
  imageUrl: product.imageUrl,
  meta: [getBrandModelLabel(product), level].filter(Boolean).join(' · '),
  quantity: Math.max(1, Math.floor(quantity) || 1),
  unitPrice: getPriceByLevel(product, level),
  ivaPercent: product.iva ?? 0,
})
