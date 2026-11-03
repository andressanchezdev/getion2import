// billing.thunks · cargas y cambios de facturación: facturas de la bodega, datos fiscales con sus series, guardar los datos fiscales y cambiar una serie
// conecta con: billing.service (llamadas) y billing.slice (reacciona); las despachan useInvoices, useBillingSettings y los formularios
// ojo: las cargas llevan su requestId y el slice descarta respuestas de otra bodega; guardar no se acepta dos veces a la vez (condition) y devuelve lo que dejó el backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { fetchBillingConfig, fetchDocSeries, fetchInvoices, updateBillingConfig, updateDocSeries } from '../services/billing.service'
import type { BillingConfig, BillingConfigInput, BillingState, DocSeries, Invoice } from '../types/billing.types'

type Config = { state: { billing: BillingState }; rejectValue: string }
const notSaving = (_: unknown, { getState }: { getState: () => { billing: BillingState } }) => !getState().billing.saving

export const loadInvoicesThunk = createAsyncThunk<Invoice[], number | undefined, Config>('billing/loadInvoices', async (warehouseId, { rejectWithValue }) => {
  try {
    return await fetchInvoices(warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las facturas.'))
  }
})

export interface BillingSettings {
  config: BillingConfig | null
  series: DocSeries[]
}

export const loadBillingSettingsThunk = createAsyncThunk<BillingSettings, number, Config>('billing/loadSettings', async (warehouseId, { rejectWithValue }) => {
  try {
    const [config, series] = await Promise.all([fetchBillingConfig(warehouseId), fetchDocSeries(warehouseId)])
    return { config, series }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la configuración de facturación.'))
  }
})

export const saveBillingConfigThunk = createAsyncThunk<BillingConfig, { warehouseId: number; input: BillingConfigInput }, Config>(
  'billing/saveConfig',
  async ({ warehouseId, input }, { rejectWithValue }) => {
    try {
      return await updateBillingConfig(warehouseId, input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron guardar los datos fiscales.'))
    }
  },
  { condition: notSaving }
)

export const saveDocSeriesThunk = createAsyncThunk<DocSeries, { seriesId: number; prefix: string; nextNumber: number }, Config>(
  'billing/saveSeries',
  async ({ seriesId, prefix, nextNumber }, { rejectWithValue }) => {
    try {
      return await updateDocSeries(seriesId, { prefix, nextNumber })
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cambiar la serie de consecutivos.'))
    }
  },
  { condition: notSaving }
)
