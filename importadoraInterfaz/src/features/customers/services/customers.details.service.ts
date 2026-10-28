// customers.details.service · llamadas al backend de lo que cuelga de un cliente: direcciones (listar, agregar, borrar) y descuentos (listar, borrar)
// conecta con: api/client y api/config, customers.adapter (convierte); las usa customers.details.thunks
// ojo: los DELETE llevan el id en el cuerpo ({ directionId } / { discountId }). Quedan pendientes (sin pantalla todavía): editar dirección y crear o editar descuento
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { CUSTOMER_EXTRAS_PAGE_SIZE } from '../constants/customers.constants'
import { toDirection, toDiscount } from '../helpers/customers.adapter'
import type { DirectionDto, DiscountDto } from '../types/customers.api.types'
import type { Direction, DirectionInput, Discount } from '../types/customers.types'

const { DIRECTIONS, DISCOUNTS } = API_CONFIG.ENDPOINTS

const firstPage = (userId: number) => ({ userId, page: 1, pageSize: CUSTOMER_EXTRAS_PAGE_SIZE })

export const fetchDirections = async (userId: number): Promise<Direction[]> => {
  const { data } = await apiClient.post<APIResponse<DirectionDto[] | null>>(DIRECTIONS.LIST, firstPage(userId))
  return (data.data ?? []).map(toDirection)
}

export const addDirection = async (userId: number, input: DirectionInput): Promise<void> => {
  await apiClient.post(DIRECTIONS.REGISTER, { userId, ...input })
}

export const deleteDirection = async (directionId: number): Promise<void> => {
  await apiClient.delete(DIRECTIONS.DELETE, { data: { directionId } })
}

export const fetchDiscounts = async (userId: number): Promise<Discount[]> => {
  const { data } = await apiClient.post<APIResponse<DiscountDto[] | null>>(DISCOUNTS.LIST, firstPage(userId))
  return (data.data ?? []).map(toDiscount)
}

export const deleteDiscount = async (discountId: number): Promise<void> => {
  await apiClient.delete(DISCOUNTS.DELETE, { data: { discountId } })
}
