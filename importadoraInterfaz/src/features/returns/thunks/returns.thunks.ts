// returns.thunks · carga la lista de devoluciones, las crea, las aprueba o rechaza, y busca la venta a la que se asocian
// conecta con: returns.service (llamadas) y returns.slice (reacciona); las despachan useReturnsList y useCreateReturnForm
// ojo: aprobar o rechazar recarga la lista para que el estado y los KPIs reflejen lo que dice el backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
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

export const approveReturnThunk = createAsyncThunk<void, number, Config>('returns/approve', async (id, { dispatch, rejectWithValue }) => {
  try {
    await approveReturn(id)
    toast.success(`Devolución #${id} aprobada con éxito`)
    await dispatch(loadReturnsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'Error al aprobar devolución')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const rejectReturnThunk = createAsyncThunk<void, number, Config>('returns/reject', async (id, { dispatch, rejectWithValue }) => {
  try {
    await rejectReturn(id)
    toast.info(`Devolución #${id} rechazada`)
    await dispatch(loadReturnsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'Error al rechazar devolución')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const createReturnThunk = createAsyncThunk<ReturnDto, CreateReturnInput, Config>('returns/create', async (input, { dispatch, rejectWithValue }) => {
  try {
    const created = await createReturn(input)
    toast.success('¡Devolución registrada exitosamente!')
    await dispatch(loadReturnsThunk())
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
