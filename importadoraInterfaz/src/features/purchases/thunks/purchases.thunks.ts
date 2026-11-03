// purchases.thunks · cargas y cambios de compras: lista de la bodega, detalle, proveedores, crear, recibir, anular y bajar el Excel
// conecta con: purchases.service (llamadas) y purchases.slice (reacciona); las despachan usePurchases, usePurchaseDetail, usePurchaseForm, usePurchaseReceive y usePurchaseActions
// ojo: la lista y el detalle llevan su requestId y el slice descarta respuestas viejas; crear, recibir y anular no se aceptan a la vez (condition) y devuelven la orden que dejó el backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { createPurchase, downloadPurchaseExcel, fetchPurchase, fetchPurchases, fetchSuppliers, receivePurchase, voidPurchase } from '../services/purchases.service'
import type { CreatePurchaseInput, Purchase, PurchasesState, ReceiveLineInput, SupplierOption } from '../types/purchases.types'

type Config = { state: { purchases: PurchasesState }; rejectValue: string }
const notSaving = (_: unknown, { getState }: { getState: () => { purchases: PurchasesState } }) => !getState().purchases.saving

export const loadPurchasesThunk = createAsyncThunk<Purchase[], number | undefined, Config>('purchases/load', async (warehouseId, { rejectWithValue }) => {
  try {
    return await fetchPurchases(warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las compras.'))
  }
})

export const loadPurchaseDetailThunk = createAsyncThunk<Purchase, number, Config>('purchases/loadDetail', async (id, { rejectWithValue }) => {
  try {
    return await fetchPurchase(id)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la orden de compra.'))
  }
})

export const loadSuppliersThunk = createAsyncThunk<SupplierOption[], void, Config>('purchases/loadSuppliers', async (_, { rejectWithValue }) => {
  try {
    return await fetchSuppliers()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los proveedores.'))
  }
})

export const createPurchaseThunk = createAsyncThunk<Purchase, CreatePurchaseInput, Config>(
  'purchases/create',
  async (input, { rejectWithValue }) => {
    try {
      return await createPurchase(input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo crear la orden de compra.'))
    }
  },
  { condition: notSaving }
)

export const receivePurchaseThunk = createAsyncThunk<Purchase, { id: number; lines: ReceiveLineInput[] }, Config>(
  'purchases/receive',
  async ({ id, lines }, { rejectWithValue }) => {
    try {
      return await receivePurchase(id, lines)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo registrar la recepción.'))
    }
  },
  { condition: notSaving }
)

export const voidPurchaseThunk = createAsyncThunk<number, number, Config>(
  'purchases/void',
  async (id, { rejectWithValue }) => {
    try {
      await voidPurchase(id)
      return id
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo anular la orden de compra.'))
    }
  },
  { condition: notSaving }
)

export const exportPurchaseExcelThunk = createAsyncThunk<string, { id: number; serial: string }, Config>(
  'purchases/downloadExcel',
  async ({ id, serial }, { rejectWithValue }) => {
    try {
      return await downloadPurchaseExcel(id, `orden-compra-${serial}`)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo descargar el archivo de la orden.'))
    }
  }
)
