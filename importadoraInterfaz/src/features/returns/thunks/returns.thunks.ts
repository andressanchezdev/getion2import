// returns.thunks · carga la lista de devoluciones, las crea, las aprueba o rechaza, y busca la venta a la que se asocian
// conecta con: returns.service (llamadas) y returns.slice (reacciona); las despachan useReturnsList y useCreateReturnForm
// ojo: con el socket en vivo la lista se actualiza por evento (returns.realtime); crear, aprobar o rechazar solo recargan como respaldo sin socket
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { isRealtimeLive } from '@/features/realtime/helpers/realtime.guards'
import { toast } from '@/global/helpers/feedback/toast'
import { approveReturn, createReturn, fetchReturns, fetchSaleWithItems, rejectReturn, searchSales } from '../services/returns.service'
import type { CreateReturnInput, ReturnDto, ReturnsState, SaleOption } from '../types/returns.types'

type Config = { state: { returns: ReturnsState }; rejectValue: string }

export const loadReturnsThunk = createAsyncThunk<ReturnDto[], void, Config>('returns/load', async (_, { getState, rejectWithValue }) => {
  try {
    return await fetchReturns(getState().returns.warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las devoluciones.'))
  }
})

export const approveReturnThunk = createAsyncThunk<void, number, Config>('returns/approve', async (id, { dispatch, getState, rejectWithValue }) => {
  try {
    await approveReturn(id)
    toast.success(`Devolución #${id} aprobada con éxito`)
    if (!isRealtimeLive(getState())) await dispatch(loadReturnsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'Error al aprobar devolución')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const rejectReturnThunk = createAsyncThunk<void, { id: number; reason: string }, Config>('returns/reject', async ({ id, reason }, { dispatch, getState, rejectWithValue }) => {
  try {
    await rejectReturn(id, reason)
    toast.info(`Devolución #${id} rechazada`)
    if (!isRealtimeLive(getState())) await dispatch(loadReturnsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'Error al rechazar devolución')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const createReturnThunk = createAsyncThunk<ReturnDto, CreateReturnInput, Config>('returns/create', async (input, { dispatch, getState, rejectWithValue }) => {
  try {
    const created = await createReturn(input)
    toast.success('¡Devolución registrada exitosamente!')
    if (!isRealtimeLive(getState())) await dispatch(loadReturnsThunk())
    return created
  } catch (error) {
    const message = getErrorMessage(error, 'Error al registrar la devolución')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const searchSalesThunk = createAsyncThunk<SaleOption[], string, Config>('returns/searchSales', async (query, { rejectWithValue }) => {
  try {
    return await searchSales(query)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar las ventas.'))
  }
})

export const loadSaleItemsThunk = createAsyncThunk<SaleOption, SaleOption, Config>('returns/loadSale', async (sale) => {
  try {
    return await fetchSaleWithItems(sale.id)
  } catch {
    return sale // sin detalle se muestra la venta tal como vino de la búsqueda
  }
})
