// quotations.draft · funciones puras del formulario de nueva cotización: opciones de cliente y producto, renglones y total
// conecta con: quotations.thunks (arma las opciones), useQuotationForm (renglones y total); con pruebas en quotations.draft.test.ts
import type { Product } from '@/features/shop'
import type { QuotationCustomerSearchDto } from '../types/quotations.api.types'
import type { QuotationCustomerOption, QuotationItemDraft, QuotationProductOption } from '../types/quotations.types'

// el cliente que llega de la búsqueda, con nombre completo y el mejor teléfono
export const toCustomerOption = (dto: QuotationCustomerSearchDto): QuotationCustomerOption => ({
  id: dto.id,
  name: dto.businessName || [dto.name, dto.lastName].filter(Boolean).join(' ') || 'Cliente sin nombre',
  identification: dto.identification ?? '',
  phone: dto.mobile || dto.phone || '',
})

// el producto de la tienda como opción; el precio inicial es el de mostrador (P0)
export const toProductOption = (product: Product): QuotationProductOption => ({
  id: Number(product.id),
  code: product.code,
  name: product.name,
  price: product.prices.p0,
})

// agrega el producto; si ya estaba suma una unidad
export const addProductToDraft = (items: QuotationItemDraft[], product: QuotationProductOption): QuotationItemDraft[] =>
  items.some((it) => it.productId === product.id)
    ? items.map((it) => (it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it))
    : [...items, { productId: product.id, productCode: product.code, productName: product.name, quantity: 1, unitPrice: product.price }]

// cambia un campo del renglón dejando la cantidad en 1 o más y el precio en 0 o más
export const patchDraftItem = (items: QuotationItemDraft[], productId: number, patch: Partial<Pick<QuotationItemDraft, 'quantity' | 'unitPrice'>>): QuotationItemDraft[] =>
  items.map((it) =>
    it.productId === productId
      ? {
          ...it,
          ...(patch.quantity !== undefined && { quantity: Math.max(1, patch.quantity) }),
          ...(patch.unitPrice !== undefined && { unitPrice: Math.max(0, patch.unitPrice) }),
        }
      : it
  )

export const draftTotal = (items: QuotationItemDraft[]): number => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
