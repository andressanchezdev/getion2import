// customers.details.service · lo que cuelga de un cliente: direcciones (listar, agregar, borrar) y descuentos
// conecta con: api/client y api/config, customers.adapter (convierte); las usa customers.details.thunks
// ojo: las direcciones no son una tabla aparte: son una lista dentro del cliente; agregar o borrar es leer el cliente y guardarlo con PUT /customers/:id
// ojo: la API todavía no tiene rutas de descuentos del cliente (la tabla existe en la base): la lista queda vacía y borrar avisa que no se puede
import { apiClient, API_CONFIG, createAppError, type APIResponse } from '@/api'
import { toAddressList, toDirections, withNewDirection } from '../helpers/customers.adapter'
import type { CustomerDto } from '../types/customers.api.types'
import type { Direction, DirectionInput, Discount } from '../types/customers.types'

const { CUSTOMERS } = API_CONFIG.ENDPOINTS

export const fetchDirections = async (customerId: number): Promise<Direction[]> => {
  const { data } = await apiClient.get<APIResponse<CustomerDto>>(CUSTOMERS.BY_ID(customerId))
  return toDirections(data.data)
}

// guarda la lista completa de direcciones del cliente
const saveDirections = async (customerId: number, directions: Direction[]): Promise<void> => {
  await apiClient.put(CUSTOMERS.BY_ID(customerId), { addresses: toAddressList(directions) })
}

// agrega una dirección de entrega al cliente
export const addDirection = async (customerId: number, input: DirectionInput): Promise<void> => {
  await saveDirections(customerId, withNewDirection(await fetchDirections(customerId), input))
}

// elimina una dirección de entrega del cliente
export const deleteDirection = async (customerId: number, directionId: number): Promise<void> => {
  await saveDirections(customerId, (await fetchDirections(customerId)).filter((item) => item.id !== directionId))
}

// la API todavía no tiene descuentos por cliente: devuelve una lista vacía
export const fetchDiscounts = async (): Promise<Discount[]> => []

// la API todavía no permite borrar descuentos: avisa con un error
export const deleteDiscount = async (): Promise<void> => {
  throw createAppError('La API todavía no permite borrar descuentos del cliente.')
}
