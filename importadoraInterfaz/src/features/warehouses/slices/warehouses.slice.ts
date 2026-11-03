// warehouses.slice · estado de las bodegas del backend: la lista activa (selector), la lista de gestión con inactivas y totales, y el último cambio
// conecta con: warehouses.thunks (la llenan), warehouses.selectors (lecturas) y rootReducer (clave 'warehouses'; no se persiste, la bodega ACTIVA sí vive en ui)
// ojo: guardar o cambiar el estado devuelve la lista de gestión nueva (el backend manda) y marca la bodega tocada un momento
import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { INITIAL_WAREHOUSES_STATE } from '../constants/warehouses.constants'
import { fetchWarehousesThunk, loadManagedWarehousesThunk, saveWarehouseThunk, setWarehouseActiveThunk, type WarehouseChangeResult } from '../thunks/warehouses.thunks'

const changes = [saveWarehouseThunk, setWarehouseActiveThunk] as const

export const warehousesSlice = createSlice({
    name: 'warehouses',
    initialState: INITIAL_WAREHOUSES_STATE,
    reducers: {
        clearRecentWarehouse: (state) => {
            state.recent = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWarehousesThunk.pending, (state) => {
                state.status = 'loading'
                state.error = null
            })
            .addCase(fetchWarehousesThunk.fulfilled, (state, action) => {
                state.items = action.payload
                state.status = 'succeeded'
                state.error = null
                if (state.managed.length === 0) {
                    state.managed = action.payload
                    state.managedStatus = 'succeeded'
                }
            })
            .addCase(fetchWarehousesThunk.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.payload ?? 'No se pudieron cargar las bodegas.'
            })
            .addCase(loadManagedWarehousesThunk.pending, (state) => {
                state.managedStatus = 'loading'
                state.managedError = null
            })
            .addCase(loadManagedWarehousesThunk.fulfilled, (state, action) => {
                state.managed = action.payload
                state.managedStatus = 'succeeded'
                state.managedError = null
                state.items = action.payload.filter((w) => w.isActive !== false)
                state.status = 'succeeded'
                state.error = null
            })
            .addCase(loadManagedWarehousesThunk.rejected, (state, action) => {
                state.managedStatus = 'failed'
                state.managedError = action.payload ?? 'No se pudieron cargar las bodegas.'
            })
            // guardar y cambiar el estado: mientras uno corre no se acepta otro; ojo: los matchers van después de todos los addCase
            .addMatcher(isAnyOf(...changes.map((thunk) => thunk.pending)), (state) => {
                state.saving = true
            })
            .addMatcher(isAnyOf(...changes.map((thunk) => thunk.fulfilled)), (state, action) => {
                const result = action.payload as WarehouseChangeResult
                state.saving = false
                state.managed = result.items
                state.managedStatus = 'succeeded'
                state.items = result.items.filter((w) => w.isActive !== false)
                state.status = 'succeeded'
                state.recent = result.recent
            })
            .addMatcher(isAnyOf(...changes.map((thunk) => thunk.rejected)), (state) => {
                state.saving = false
            })
    },
})

export const { clearRecentWarehouse } = warehousesSlice.actions
export const warehousesReducer = warehousesSlice.reducer
export default warehousesSlice.reducer
