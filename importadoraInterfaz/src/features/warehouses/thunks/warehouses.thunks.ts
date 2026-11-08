// warehouses.thunks · cargas y cambios de bodegas del backend: la lista del selector, la de gestión, guardar y cambiar el estado
// conecta con: warehouses.service (llamadas), auth (selectRequestContext) y warehouses.slice (reacciona); las despachan useWarehouses y los hooks de gestión
// ojo: guardar y cambiar el estado devuelven la lista de gestión nueva (el backend manda) y refrescan también la lista del selector
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { createWarehouse, deleteWarehouse, fetchAllWarehouses, fetchWarehouses, updateWarehouse } from '../services/warehouses.service'
import type { CreateWarehouseInput, RecentWarehouseChange, Warehouse, WarehousesState } from '../types/warehouse.types'

export const fetchWarehousesThunk = createAsyncThunk<Warehouse[], void, { state: { auth: AuthState; warehouses: WarehousesState }; rejectValue: string }>(
    'warehouses/fetch',
    async (_, { getState, rejectWithValue }) => {
        const ctx = selectRequestContext(getState())
        if (!ctx) return rejectWithValue('No hay una sesión activa.')
        try {
            return await fetchWarehouses(ctx.companyId)
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las bodegas.'))
        }
    },
    {
        // ojo: si ya hay una carga en curso no se pide otra (en desarrollo, React StrictMode ejecuta los efectos dos veces)
        condition: (_, { getState }) => getState().warehouses.status !== 'loading',
    }
)

// las sedes de una compañía concreta (la elige el superadmin en Configuración > Compañías); no toca la lista de la bodega activa
export const loadCompanyWarehousesThunk = createAsyncThunk<Warehouse[], number, { rejectValue: string }>('warehouses/ofCompany', async (companyId, { rejectWithValue }) => {
    try {
        return await fetchWarehouses(companyId)
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las sedes de la compañía.'))
    }
})

// ---- gestión de bodegas (pantalla Sedes): todas, con totales, y los cambios que devuelven la lista nueva ----
type ManageConfig = { state: { auth: AuthState; ui: { activeCompanyId?: number }; warehouses: WarehousesState }; rejectValue: string }

export const loadManagedWarehousesThunk = createAsyncThunk<Warehouse[], void, ManageConfig>('warehouses/loadManaged', async (_, { getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    try {
        return await fetchAllWarehouses(ctx?.companyId)
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las bodegas.'))
    }
}, {
    // ojo: la pantalla y la tabla usan el mismo hook; si ya hay una carga en curso no se pide otra
    condition: (_, { getState }) => getState().warehouses.managedStatus !== 'loading',
})

export interface WarehouseChangeResult {
    items: Warehouse[]
    recent: RecentWarehouseChange | null
}

// no se acepta un cambio mientras otro está en curso
const notSaving = (_: unknown, { getState }: { getState: () => { warehouses: WarehousesState } }) => !getState().warehouses.saving

// crea (sin id) o edita (con id) una bodega; devuelve la lista nueva y cuál se marca; también refresca la lista del selector de bodega
export const saveWarehouseThunk = createAsyncThunk<WarehouseChangeResult, { id?: string; input: CreateWarehouseInput }, ManageConfig>(
    'warehouses/save',
    async ({ id, input }, { getState, dispatch, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        const targetCompanyId = ctx?.companyId || state.ui.activeCompanyId
        try {
            const payloadWithCompany: CreateWarehouseInput = {
                ...input,
                companyId: targetCompanyId ? Number(targetCompanyId) : undefined,
            }
            const saved = id ? await updateWarehouse(id, input) : await createWarehouse(payloadWithCompany)
            const items = await fetchAllWarehouses(targetCompanyId)
            dispatch(fetchWarehousesThunk())
            return { items, recent: { id: saved.id, kind: id ? 'updated' : 'new' } }
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudo guardar la bodega.'))
        }
    },
    { condition: notSaving }
)

// activa (PUT isActive) o desactiva (DELETE) una bodega y devuelve la lista nueva
export const setWarehouseActiveThunk = createAsyncThunk<WarehouseChangeResult, { id: string; isActive: boolean; reason?: string }, ManageConfig>(
    'warehouses/setActive',
    async ({ id, isActive, reason }, { getState, dispatch, rejectWithValue }) => {
        const ctx = selectRequestContext(getState())
        try {
            if (isActive) await updateWarehouse(id, { isActive: true })
            else await deleteWarehouse(id, reason ?? '')
            const items = await fetchAllWarehouses(ctx?.companyId)
            dispatch(fetchWarehousesThunk())
            return { items, recent: { id, kind: 'updated' } }
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudo cambiar el estado de la bodega.'))
        }
    },
    { condition: notSaving }
)
