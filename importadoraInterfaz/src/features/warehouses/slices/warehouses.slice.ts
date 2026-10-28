// warehouses.slice · estado de las bodegas del backend: lista, estado de carga y último error
// conecta con: warehouses.thunks (la llenan), warehouses.selectors (lecturas) y rootReducer (clave 'warehouses'; no se persiste, la bodega ACTIVA sí vive en ui)
import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_WAREHOUSES_STATE } from '../constants/warehouses.constants'
import { fetchWarehousesThunk } from '../thunks/warehouses.thunks'

export const warehousesSlice = createSlice({
    name: 'warehouses',
    initialState: INITIAL_WAREHOUSES_STATE,
    reducers: {},
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
            })
            .addCase(fetchWarehousesThunk.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.payload ?? 'No se pudieron cargar las bodegas.'
            })
    },
})
//AJUSTES SOBRE ESTA CAPA VALIDANDO CORRECTAMENTE EL Id obtenido en el auth

export const warehousesReducer = warehousesSlice.reducer
export default warehousesSlice.reducer
