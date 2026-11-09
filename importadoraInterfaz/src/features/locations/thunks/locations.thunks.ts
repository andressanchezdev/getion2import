// locations.thunks · cargas y acciones de ubicaciones: listar las de una bodega, ver el contenido de una, crear, editar, activar o desactivar y borrar
// conecta con: locations.service (llamadas), auth (selectRequestContext) y locations.slice (reacciona); las despachan useLocations, useLocationContent y los paneles
// ojo: las cargas llevan su requestId y el slice descarta las respuestas de pedidos anteriores; los cambios devuelven la lista nueva (el backend manda) y no se aceptan dos a la vez
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { createLocation, deleteLocation, fetchLocationContent, fetchLocations, setLocationActive, updateLocation } from '../services/locations.service'
import type { LocationContentItem, LocationInput, LocationsState, WarehouseLocation } from '../types/locations.types'

type ThunkConfig = { state: { auth: AuthState; locations: LocationsState }; rejectValue: string }
const NO_SESSION = 'No hay una sesión activa.'

export const loadLocationsThunk = createAsyncThunk<WarehouseLocation[], number, ThunkConfig>('locations/load', async (warehouseId, { rejectWithValue }) => {
  try {
    return await fetchLocations(warehouseId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las ubicaciones.'))
  }
})

export const loadLocationContentThunk = createAsyncThunk<LocationContentItem[], { warehouseId: number; code: string }, ThunkConfig>('locations/loadContent', async ({ warehouseId, code }, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchLocationContent(ctx, warehouseId, code)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el contenido de la ubicación.'))
  }
})

// no se acepta un cambio mientras otro está en curso
const notSaving = (_: unknown, { getState }: { getState: () => { locations: LocationsState } }) => !getState().locations.list.saving

// crea una ubicación y devuelve la lista nueva de la bodega
export const createLocationThunk = createAsyncThunk<WarehouseLocation[], { warehouseId: number; input: LocationInput }, ThunkConfig>(
  'locations/create',
  async ({ warehouseId, input }, { rejectWithValue }) => {
    try {
      await createLocation(warehouseId, input)
      return await fetchLocations(warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo crear la ubicación.'))
    }
  },
  { condition: notSaving }
)

// edita código y descripción y devuelve la lista nueva
export const updateLocationThunk = createAsyncThunk<WarehouseLocation[], { warehouseId: number; locationId: number; input: LocationInput }, ThunkConfig>(
  'locations/update',
  async ({ warehouseId, locationId, input }, { rejectWithValue }) => {
    try {
      await updateLocation(warehouseId, locationId, input)
      return await fetchLocations(warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo guardar la ubicación.'))
    }
  },
  { condition: notSaving }
)

// activa o desactiva una ubicación y devuelve la lista nueva
export const toggleLocationThunk = createAsyncThunk<WarehouseLocation[], { warehouseId: number; locationId: number; isActive: boolean; reason?: string }, ThunkConfig>(
  'locations/toggle',
  async ({ warehouseId, locationId, isActive, reason }, { rejectWithValue }) => {
    try {
      await setLocationActive(warehouseId, locationId, isActive, reason)
      return await fetchLocations(warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo cambiar el estado de la ubicación.'))
    }
  },
  { condition: notSaving }
)

// borra una ubicación vacía y devuelve la lista nueva
export const deleteLocationThunk = createAsyncThunk<WarehouseLocation[], { warehouseId: number; locationId: number; reason: string }, ThunkConfig>(
  'locations/delete',
  async ({ warehouseId, locationId, reason }, { rejectWithValue }) => {
    try {
      await deleteLocation(warehouseId, locationId, reason)
      return await fetchLocations(warehouseId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudo borrar la ubicación.'))
    }
  },
  { condition: notSaving }
)
