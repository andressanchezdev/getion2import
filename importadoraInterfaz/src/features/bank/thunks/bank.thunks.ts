// bank.thunks · cargas y acciones de la conciliación bancaria: listar movimientos, subir el PDF, traer pagos por verificar, confirmar e ignorar
// conecta con: bank.service (llamadas) y bank.slice (reacciona); las despachan useBankRecords, useBankUpload, usePendingPayments y useBankActions
// ojo: la lista lleva su requestId y el slice descarta respuestas de pedidos anteriores; subir un PDF recarga la lista; confirmar e ignorar no se aceptan dos a la vez
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type Paginated } from '@/api'
import { BANK_PAGE_SIZE } from '../constants/bank.constants'
import { confirmBankRecord, fetchBankRecords, fetchPendingTransferPayments, ignoreBankRecord, uploadBankStatement } from '../services/bank.service'
import type { BankRecord, BankState, BankUploadResult, PendingPayment } from '../types/bank.types'

type ThunkConfig = { state: { bank: BankState }; rejectValue: string }

export const loadBankRecordsThunk = createAsyncThunk<Paginated<BankRecord>, void, ThunkConfig>('bank/loadRecords', async (_, { getState, rejectWithValue }) => {
  const { filters, page } = getState().bank.list
  try {
    return await fetchBankRecords(filters, page, BANK_PAGE_SIZE)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los movimientos del banco.'))
  }
})

// sube el PDF del banco y, si se leyó bien, vuelve a cargar la lista
export const uploadBankStatementThunk = createAsyncThunk<BankUploadResult, File, ThunkConfig>('bank/upload', async (file, { dispatch, rejectWithValue }) => {
  try {
    const result = await uploadBankStatement(file)
    dispatch(loadBankRecordsThunk())
    return result
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo leer el PDF del banco.'))
  }
})

export const loadPendingPaymentsThunk = createAsyncThunk<PendingPayment[], void, ThunkConfig>('bank/loadPendingPayments', async (_, { rejectWithValue }) => {
  try {
    return await fetchPendingTransferPayments()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los pagos por verificar.'))
  }
})

const notSaving = (_: unknown, { getState }: { getState: () => { bank: BankState } }) => !getState().bank.saving

// confirma un movimiento (con o sin pago ligado) y recarga la lista y los pagos por verificar
export const confirmBankRecordThunk = createAsyncThunk<void, { recordId: number; paymentId?: number; notes?: string }, ThunkConfig>(
  'bank/confirm',
  async ({ recordId, paymentId, notes }, { dispatch, rejectWithValue }) => {
    try {
      await confirmBankRecord(recordId, paymentId, notes)
      dispatch(loadBankRecordsThunk())
      dispatch(loadPendingPaymentsThunk())
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo confirmar el movimiento.'))
    }
  },
  { condition: notSaving }
)

// marca un movimiento como ignorado y recarga la lista
export const ignoreBankRecordThunk = createAsyncThunk<void, { recordId: number; notes?: string }, ThunkConfig>(
  'bank/ignore',
  async ({ recordId, notes }, { dispatch, rejectWithValue }) => {
    try {
      await ignoreBankRecord(recordId, notes)
      dispatch(loadBankRecordsThunk())
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo ignorar el movimiento.'))
    }
  },
  { condition: notSaving }
)
