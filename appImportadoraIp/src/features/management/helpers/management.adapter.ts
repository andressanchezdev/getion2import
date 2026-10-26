// management.adapter · convierte la respuesta de POST /management en etapas, canales y contadores de la app
// conecta con: management.service (lo aplica a la respuesta); es el único lugar que conoce los nombres del backend en gestión de pedidos
// ojo: un contador que falta o no es número queda en 0; todos los contadores son del mismo momento (una sola respuesta)
import { CHANNELS, EXTRAS, STAGES } from '../constants/management.constants'
import type { ManagementCountsDto, ManagementOrderDto } from '../types/management.api.types'
import type { ManagementOrder, PipelineData } from '../types/management.types'

const count = (dto: ManagementCountsDto, field: string): number => {
  const value = (dto as Record<string, unknown>)[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export const toPipeline = (dto: ManagementCountsDto): PipelineData => ({
  stages: STAGES.map((stage) => ({ key: stage.key, label: stage.label, count: count(dto, stage.field) })),
  channels: CHANNELS.map((channel) => ({ key: channel.key, label: channel.label, count: count(dto, channel.field) })),
  extras: EXTRAS.map((extra) => ({ key: extra.key, label: extra.label, count: count(dto, extra.field) })),
})

const personName = (person: { name?: string; lastName?: string } | null | undefined, fallback: string): string => `${person?.name ?? ''} ${person?.lastName ?? ''}`.trim() || fallback

// el backend manda 0001-01-01T00:00:00Z cuando no hay fecha
const dayOf = (value: string | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? '' : date.toISOString().slice(0, 10)
}

export const toOrder = (dto: ManagementOrderDto): ManagementOrder => ({
  id: dto.saleId,
  serialCode: dto.serialCode ? dto.serialCode : null,
  customerName: personName(dto.customerInformation, 'Sin cliente'),
  sellerName: personName(dto.sellerInformation, '—'),
  paymentMethod: dto.paymentMethod ?? '',
  totalAmount: Number.isFinite(dto.totalAmount) ? (dto.totalAmount as number) : 0,
  createdAt: dayOf(dto.createdAt),
  paused: dto.isPause === 1,
  transactionVerified: dto.verifiedTransaction === 1,
  locationVerified: dto.verifiedLocation === 1,
})
