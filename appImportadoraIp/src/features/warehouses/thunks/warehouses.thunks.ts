// warehouses.thunks · carga las bodegas del backend con el contexto de la sesión
// conecta con: warehouses.service (llamada), auth (selectRequestContext) y warehouses.slice (reacciona); la despacha useWarehouses
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import type { WarehousesState } from '../types/warehouse.types'
import { fetchWarehouses } from '../services/warehouses.service'
import type { Warehouse } from '../types/warehouse.types'

export const fetchWarehousesThunk = createAsyncThunk<Warehouse[], void, { state: { auth: AuthState; warehouses: WarehousesState }; rejectValue: string }>(
    'warehouses/fetch',
    async (_, { getState, rejectWithValue }) => {
        const ctx = selectRequestContext(getState())
        if (!ctx) return rejectWithValue('No hay una sesión activa.')
        try {
            return await fetchWarehouses(ctx)
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las bodegas.'))
        }
    },
    {
        // ojo: si ya hay una carga en curso no se pide otra (en desarrollo, React StrictMode ejecuta los efectos dos veces)
        condition: (_, { getState }) => getState().warehouses.status !== 'loading',
    }
)
