// locations.slice · estado de ubicaciones: la lista de la bodega abierta y el contenido de la ubicación seleccionada
// conecta con: locations.thunks (lo llenan), locations.selectors (lecturas) y rootReducer (clave 'locations'; NO se guarda en el navegador)
// ojo: al cambiar de bodega la lista se vacía para no mostrar por un instante las ubicaciones de la anterior
import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { INITIAL_LOCATIONS_STATE } from '../constants/locations.constants'
import { createLocationThunk, deleteLocationThunk, loadLocationContentThunk, loadLocationsThunk, toggleLocationThunk, updateLocationThunk } from '../thunks/locations.thunks'

const changes = [createLocationThunk, updateLocationThunk, toggleLocationThunk, deleteLocationThunk] as const

const contentKey = (arg: { warehouseId: number; code: string }) => `${arg.warehouseId}|${arg.code}`

export const locationsSlice = createSlice({
  name: 'locations',
  initialState: INITIAL_LOCATIONS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadLocationsThunk.pending, (state, action) => {
        if (state.list.warehouseId !== action.meta.arg) state.list.items = []
        state.list.warehouseId = action.meta.arg
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadLocationsThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload
        state.list.status = 'succeeded'
      })
      .addCase(loadLocationsThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar las ubicaciones.'
      })
      .addCase(loadLocationContentThunk.pending, (state, action) => {
        state.content = { key: contentKey(action.meta.arg), items: [], status: 'loading', error: null }
      })
      .addCase(loadLocationContentThunk.fulfilled, (state, action) => {
        if (state.content.key !== contentKey(action.meta.arg)) return
        state.content.items = action.payload
        state.content.status = 'succeeded'
      })
      .addCase(loadLocationContentThunk.rejected, (state, action) => {
        if (state.content.key !== contentKey(action.meta.arg)) return
        state.content.status = 'failed'
        state.content.error = action.payload ?? 'No se pudo cargar el contenido de la ubicación.'
      })
      // crear, editar, activar o desactivar y borrar: mientras uno corre no se acepta otro; ojo: los matchers van después de todos los addCase
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.pending)), (state) => {
        state.list.saving = true
      })
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.fulfilled)), (state, action) => {
        state.list.saving = false
        state.list.items = action.payload as typeof state.list.items
        state.list.status = 'succeeded'
      })
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.rejected)), (state) => {
        state.list.saving = false
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_LOCATIONS_STATE
      )
  },
})

export const locationsReducer = locationsSlice.reducer
export default locationsSlice.reducer
