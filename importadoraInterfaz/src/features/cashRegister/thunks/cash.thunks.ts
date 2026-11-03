// cash.thunks · cargas y cambios del turno de caja: leer el de la bodega, abrirlo y cerrarlo
// conecta con: cash.service (llamadas) y cash.slice (reacciona); las despachan useCashSession, useCashOpen y useCashClose
// ojo: la carga lleva su requestId y el slice descarta respuestas de otra bodega; abrir y cerrar no se aceptan a la vez (condition) y devuelven el turno que dejó el backend
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { closeCashSession, collectPayments, fetchActiveCashSession, fetchSaleLines, openCashSession } from '../services/cash.service'
import type { CashSession, CashState, CloseCashInput, CollectPaymentInput, CollectResult, InvoiceLineItem } from '../types/cash.types'

type ThunkConfig = { state: { cash: CashState }; rejectValue: string }

export const loadCashSessionThunk = createAsyncThunk<CashSession | null, number, ThunkConfig>('cash/load', async (warehouseId, { rejectWithValue }) => {
  try {
    return await fetchActiveCashSession(warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo consultar el turno de caja.'))
  }
})

const notSaving = (_: unknown, { getState }: { getState: () => { cash: CashState } }) => !getState().cash.saving

export const openCashSessionThunk = createAsyncThunk<CashSession, { warehouseId: number; openingAmount: number }, ThunkConfig>(
  'cash/open',
  async ({ warehouseId, openingAmount }, { rejectWithValue }) => {
    try {
      return await openCashSession(warehouseId, openingAmount)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo abrir el turno de caja.'))
    }
  },
  { condition: notSaving }
)

export const closeCashSessionThunk = createAsyncThunk<CashSession, CloseCashInput, ThunkConfig>(
  'cash/close',
  async (input, { rejectWithValue }) => {
    try {
      return await closeCashSession(input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cerrar el turno de caja.'))
    }
  },
  { condition: notSaving }
)

// cobra un pedido con pagos mezclados; quien la despacha vuelve a leer los pedidos y el turno al terminar (useCashCollect)
export const collectPaymentsThunk = createAsyncThunk<CollectResult, CollectPaymentInput, ThunkConfig>('cash/collect', async (input, { rejectWithValue }) => {
  try {
    return await collectPayments(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo registrar el cobro.'))
  }
})

// trae los renglones de un pedido para que el cajero los coteje; si falla devuelve el mensaje
export const loadSaleLinesThunk = createAsyncThunk<InvoiceLineItem[], number, ThunkConfig>('cash/loadSaleLines', async (orderId, { rejectWithValue }) => {
  try {
    return await fetchSaleLines(orderId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los productos de la factura.'))
  }
})
