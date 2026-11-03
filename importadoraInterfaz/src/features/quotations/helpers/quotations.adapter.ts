// quotations.adapter · convierte la cotización de la API a lo que usa la app, filtra por texto y fechas y arma el enlace de WhatsApp; es el único lugar que conoce los nombres del backend
// conecta con: quotations.service (convierte), quotations.selectors (filtra), QuotationDetailPanel (enlace de WhatsApp), quotations.api.types y quotations.types
// ojo: el WhatsApp es el celular del cliente (o su teléfono si no tiene celular); un número colombiano de 10 dígitos se manda con el 57 por delante
import type { QuotationDto, QuotationItemDto } from '../types/quotations.api.types'
import type { Quotation, QuotationFilters, QuotationItem, QuotationStatus } from '../types/quotations.types'

const STATUSES: QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']

export const toQuotationStatus = (status: string): QuotationStatus => (STATUSES.includes(status as QuotationStatus) ? (status as QuotationStatus) : 'draft')

// convierte un renglón de cotización de la API en el que usa la app
const toItem = (dto: QuotationItemDto): QuotationItem => ({
  id: dto.id,
  productId: dto.productId,
  code: dto.productCode ?? '',
  name: dto.productName ?? dto.productCode ?? 'Repuesto',
  quantity: dto.quantity,
  unitPrice: dto.unitPrice,
  lineTotal: dto.lineTotal,
})

// phones: id del cliente -> su celular o teléfono
export const toQuotation = (dto: QuotationDto, phones: Map<number, string>): Quotation => ({
  id: dto.id,
  serialCode: dto.serialCode || `COT-${dto.id}`,
  customerId: dto.customerId,
  customerName: (dto.customerName ?? '').trim(),
  whatsapp: phones.get(dto.customerId) ?? '',
  employeeName: (dto.employeeName ?? '').trim(),
  status: toQuotationStatus(dto.status),
  total: dto.total,
  notes: dto.notes ?? '',
  createdAt: dto.createdAt,
  items: (dto.items ?? []).map(toItem),
})

// el número del cliente: celular primero, después el teléfono, solo dígitos
export const pickWhatsapp = (mobile?: string | null, phone?: string | null): string => (mobile || phone || '').replace(/\D/g, '')

// «3001234567» -> «573001234567»; un número que ya trae indicativo se deja igual
export const toWhatsappNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `57${digits}` : digits
}

// arma el mensaje de WhatsApp con el código, los renglones y el total de la cotización
export const buildWhatsappMessage = (quotation: Quotation): string => {
  const lines = quotation.items.map((item) => `• ${item.name} x${item.quantity}`)
  return [`Hola ${quotation.customerName || ''}, te comparto la cotización ${quotation.serialCode}:`.replace('  ', ' '), ...lines, `Total: $${Math.round(quotation.total).toLocaleString('es-CO')}`].join('\n')
}

// arma el enlace de WhatsApp al número del cliente con el mensaje (null si no tiene número)
export const toWhatsappUrl = (quotation: Quotation): string | null => {
  const number = toWhatsappNumber(quotation.whatsapp)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappMessage(quotation))}` : null
}

// día local de la cotización en YYYY-MM-DD (para comparar con el rango de fechas)
const dayOf = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// texto (código, cliente, quién la hizo o WhatsApp) y rango de fechas de un día A a un día B, ambos incluidos
export const filterQuotations = (quotations: Quotation[], filters: QuotationFilters): Quotation[] => {
  const needle = filters.search.trim().toLowerCase()
  return quotations.filter((quotation) => {
    if (needle) {
      const haystack = [quotation.serialCode, quotation.customerName, quotation.employeeName, quotation.whatsapp].join(' ').toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    const day = dayOf(quotation.createdAt)
    if (filters.from && day < filters.from) return false
    if (filters.to && day > filters.to) return false
    return true
  })
}
