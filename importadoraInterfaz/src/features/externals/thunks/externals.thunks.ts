// externals.thunks · cargas y acciones de proveedores y transportadoras: listar, guardar (crear o editar), cambiar el estado y borrar
// conecta con: externals.service (llamadas) y externals.slice (reacciona); las despachan useExternals, useExternalActions y useExternalForm
// ojo: la lista lleva su requestId y el slice descarta respuestas de pedidos anteriores; los cambios devuelven la lista nueva (el backend manda) y no se aceptan dos a la vez
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { createExternal, deleteExternal, getExternals, updateExternal } from '../services/externals.service'
import type { CreateExternalPayload, ExternalEntity, ExternalKind, ExternalsState, UpdateExternalPayload } from '../types/externals.types'

type ThunkConfig = { state: { externals: ExternalsState }; rejectValue: string }

export const loadExternalsThunk = createAsyncThunk<ExternalEntity[], ExternalKind, ThunkConfig>('externals/load', async (kind, { rejectWithValue }) => {
  try {
    return await getExternals(kind)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el listado.'))
  }
})

// no se acepta un cambio mientras otro está en curso
const notSaving = (_: unknown, { getState }: { getState: () => { externals: ExternalsState } }) => !getState().externals.saving

// crea (sin id) o edita (con id) un registro y devuelve la lista nueva
export const saveExternalThunk = createAsyncThunk<ExternalEntity[], { id?: number; payload: CreateExternalPayload }, ThunkConfig>(
  'externals/save',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      if (id) await updateExternal(id, payload)
      else await createExternal(payload)
      return await getExternals(payload.kind)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo guardar el registro.'))
    }
  },
  { condition: notSaving }
)

// activa o desactiva un registro y devuelve la lista nueva
export const setExternalActiveThunk = createAsyncThunk<ExternalEntity[], { id: number; kind: ExternalKind; isActive: boolean }, ThunkConfig>(
  'externals/setActive',
  async ({ id, kind, isActive }, { rejectWithValue }) => {
    try {
      const payload: UpdateExternalPayload = { isActive }
      await updateExternal(id, payload)
      return await getExternals(kind)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cambiar el estado.'))
    }
  },
  { condition: notSaving }
)

// borra un registro y devuelve la lista nueva
export const deleteExternalThunk = createAsyncThunk<ExternalEntity[], { id: number; kind: ExternalKind }, ThunkConfig>(
  'externals/delete',
  async ({ id, kind }, { rejectWithValue }) => {
    try {
      await deleteExternal(id)
      return await getExternals(kind)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo eliminar el registro.'))
    }
  },
  { condition: notSaving }
)
