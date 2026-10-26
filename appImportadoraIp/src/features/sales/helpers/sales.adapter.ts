// sales.adapter · convierte lo que responde el backend en ventas (historial y carritos pendientes) a lo que usa la app
// conecta con: sales.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en ventas
// ojo: el backend manda 0001-01-01T00:00:00Z cuando no hay fecha (se deja ''); los textos y números pueden venir vacíos o nulos y quedan en '' o 0
import type { HistorySaleDto, PendingCartDto, SaleSellerDto, SaleUserDto } from '../types/sales.api.types'
import type { PendingCart, SaleRow } from '../types/sales.types'

const number = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)

const dayOf = (value: string | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? '' : date.toISOString().slice(0, 10)
}

const nameOf = (person: SaleUserDto | SaleSellerDto | null | undefined, fallback: string): string => (person?.name ?? '').trim() || fallback

export const toSaleRow = (dto: HistorySaleDto): SaleRow => ({
  id: dto.saleId,
  serialCode: dto.serialCode ? dto.serialCode : null,
  customerName: nameOf(dto.userInformation, dto.userId ? `Usuario ${dto.userId}` : 'Sin cliente'),
  sellerName: nameOf(dto.sellerInformation, dto.sellerId ? `Usuario ${dto.sellerId}` : '—'),
  status: (dto.invoiceStatus ?? '').trim(),
  totalAmount: number(dto.totalAmount),
  paidAmount: number(dto.paymentInformation?.amount),
  createdAt: dayOf(dto.created_at),
})

export const toPendingCart = (dto: PendingCartDto): PendingCart => ({
  uuid: dto.uuid,
  customerId: dto.userId ? dto.userId : null,
  customerName: nameOf(dto.userInformation, dto.userId ? `Usuario ${dto.userId}` : 'Sin cliente'),
  sellerName: nameOf(dto.sellerInformation, '—'),
  lines: number(dto.count),
  units: number(dto.quantities),
  totalAmount: number(dto.totalAmount),
  createdAt: dayOf(dto.created_at),
})
