// transfers.thunks · cargas y acciones de traslados: lista, existencias de la bodega, buscador de productos, crear, despachar y recibir
// conecta con: transfers.service (llamadas) y auth (selectRequestContext); las despachan useTransfersLoader, useWarehouseStock, useTransferProductSearch y los formularios
// ojo: las cargas llevan su requestId y el slice descarta las respuestas de pedidos anteriores; las acciones rechazan con un texto listo para mostrar
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import type { StockFullDto } from '@/features/inventory'
import { acceptTransfer, createTransferBatch, dispatchTransfer, fetchAllTraslades, fetchTransferById, fetchWarehouseStock, searchProductsMultibodega } from '../services/transfers.service'
import { groupByOrigin, validateRequest } from '../helpers/transfers.request'
import type { ProductStockMatrix, TransferRequestLine, TransferRequestResult, TrasladeItem } from '../types/transfers.types'

type ThunkState = { auth: AuthState; warehouses: { items: Array<{ id: string | number; name: string }> } }
type ThunkConfig = { state: ThunkState; rejectValue: string }
const NO_SESSION = 'No hay una sesión activa.'

export const loadTransfersThunk = createAsyncThunk<TrasladeItem[], number, ThunkConfig>('transfers/loadList', async (warehouseId, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchAllTraslades(ctx, warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los traslados.'))
  }
})

export const loadWarehouseStockThunk = createAsyncThunk<StockFullDto[], { warehouseId: number; query: string }, ThunkConfig>(
  'transfers/loadStock',
  async ({ warehouseId, query }, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    try {
      return await fetchWarehouseStock(ctx, warehouseId, query)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las existencias de la bodega.'))
    }
  }
)

export const searchTransferProductsThunk = createAsyncThunk<ProductStockMatrix[], string, ThunkConfig>('transfers/searchProducts', async (text, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await searchProductsMultibodega(ctx, state.warehouses.items, text)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron buscar los productos.'))
  }
})

// envía el pedido de traslado: crea un traslado por cada bodega de origen (todos hacia la misma bodega destino) y avisa qué pasó con cada una
// ojo: si una bodega falla las demás se crean igual; el resultado dice cuáles salieron y cuáles no
export const createTransferRequestThunk = createAsyncThunk<TransferRequestResult[], { destWarehouseId: number; lines: TransferRequestLine[]; notes?: string; isPriority?: boolean }, ThunkConfig>(
  'transfers/createRequest',
  async ({ destWarehouseId, lines, notes, isPriority }, { getState, dispatch, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue(NO_SESSION)
    const problem = validateRequest(lines, destWarehouseId)
    if (problem) return rejectWithValue(problem)

    const results: TransferRequestResult[] = []
    for (const group of groupByOrigin(lines)) {
      const base = { originWarehouseId: group.originWarehouseId, originWarehouseName: group.originWarehouseName }
      try {
        const transfer = await createTransferBatch(ctx, {
          originWarehouseId: group.originWarehouseId,
          destWarehouseId,
          notes,
          isPriority,
          items: group.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        })
        results.push({ ...base, transfer })
      } catch (error) {
        results.push({ ...base, error: getErrorMessage(error, 'No se pudo registrar el traslado.') })
      }
    }
    if (results.some((result) => result.transfer)) dispatch(loadTransfersThunk(destWarehouseId))
    return results
  }
)

// despacha el traslado (pasa a «en tránsito»); devuelve el id para que el slice actualice la fila
export const dispatchTransferThunk = createAsyncThunk<number, number, { rejectValue: string }>('transfers/dispatch', async (id, { rejectWithValue }) => {
  try {
    await dispatchTransfer(id)
    return id
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo despachar el traslado.'))
  }
})

// recibe el traslado: OK completo, o con novedad si lleva texto
export const acceptTransferThunk = createAsyncThunk<{ id: number; noveltyNotes?: string }, { transfer: TrasladeItem; noveltyNotes?: string }, { rejectValue: string }>(
  'transfers/accept',
  async ({ transfer, noveltyNotes }, { rejectWithValue }) => {
    try {
      await acceptTransfer(transfer, noveltyNotes)
      return { id: transfer.id, noveltyNotes: noveltyNotes?.trim() || undefined }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al procesar la aceptación del traslado.'))
    }
  }
)

// trae el traslado completo (con sus renglones) por su id; lo usa el panel de detalle cuando la fila de la tabla vino sin productos
export const loadTransferDetailThunk = createAsyncThunk<TrasladeItem, number, { rejectValue: string }>('transfers/loadDetail', async (id, { rejectWithValue }) => {
  try {
    return await fetchTransferById(id)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el detalle del traslado.'))
  }
})
