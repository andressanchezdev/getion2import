// customers.details.thunks · direcciones y descuentos de un cliente: cargar, agregar dirección y borrar (dirección o descuento)
// conecta con: customers.details.service (llamadas) y customers.slice (reacciona); los despachan useSelectedCustomerData y el panel del cliente
// ojo: después de agregar o borrar se vuelve a leer la lista (el backend manda). Los errores de un cambio se avisan con una alerta; mientras uno corre no se acepta otro (condition)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/toast'
import {
  addDirection,
  deleteDirection,
  deleteDiscount,
  fetchDirections,
  fetchDiscounts,
} from '../services/customers.details.service'
import type { CustomersState, Direction, DirectionInput, Discount } from '../types/customers.types'

type ThunkConfig = { state: { customers: CustomersState }; rejectValue: string }

// avisa el error al usuario y lo devuelve como rechazo del thunk
const failWith = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback)
  toast.error(message)
  return message
}

export const loadDirectionsThunk = createAsyncThunk<Direction[], number, ThunkConfig>(
  'customers/loadDirections',
  async (customerId, { rejectWithValue }) => {
    try {
      return await fetchDirections(customerId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las direcciones.'))
    }
  }
)

export const addDirectionThunk = createAsyncThunk<Direction[], { customerId: number; input: DirectionInput }, ThunkConfig>(
  'customers/addDirection',
  async ({ customerId, input }, { rejectWithValue }) => {
    try {
      await addDirection(customerId, input)
      const directions = await fetchDirections(customerId)
      toast.success('Dirección agregada')
      return directions
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo agregar la dirección.'))
    }
  },
  { condition: (_, { getState }) => !getState().customers.directions.saving }
)

export const deleteDirectionThunk = createAsyncThunk<Direction[], { customerId: number; directionId: number }, ThunkConfig>(
  'customers/deleteDirection',
  async ({ customerId, directionId }, { rejectWithValue }) => {
    try {
      await deleteDirection(directionId)
      return await fetchDirections(customerId)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo borrar la dirección.'))
    }
  },
  { condition: (_, { getState }) => !getState().customers.directions.saving }
)

export const loadDiscountsThunk = createAsyncThunk<Discount[], number, ThunkConfig>(
  'customers/loadDiscounts',
  async (customerId, { rejectWithValue }) => {
    try {
      return await fetchDiscounts(customerId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los descuentos.'))
    }
  }
)

export const deleteDiscountThunk = createAsyncThunk<Discount[], { customerId: number; discountId: number }, ThunkConfig>(
  'customers/deleteDiscount',
  async ({ customerId, discountId }, { rejectWithValue }) => {
    try {
      await deleteDiscount(discountId)
      return await fetchDiscounts(customerId)
    } catch (error) {
      return rejectWithValue(failWith(error, 'No se pudo borrar el descuento.'))
    }
  },
  { condition: (_, { getState }) => !getState().customers.discounts.saving }
)
