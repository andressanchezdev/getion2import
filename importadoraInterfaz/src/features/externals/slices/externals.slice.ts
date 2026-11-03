// externals.slice · estado de proveedores y transportadoras: la lista del tipo abierto y si hay un cambio en curso
// conecta con: externals.thunks (lo llenan), externals.selectors (lecturas) y rootReducer (clave 'externals'; NO se guarda en el navegador)
// ojo: al cambiar de proveedores a transportadoras la lista se vacía para no mostrar por un instante la del otro tipo
import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { INITIAL_EXTERNALS_STATE } from '../constants/externals.constants'
import { deleteExternalThunk, loadExternalsThunk, saveExternalThunk, setExternalActiveThunk } from '../thunks/externals.thunks'

const changes = [saveExternalThunk, setExternalActiveThunk, deleteExternalThunk] as const

export const externalsSlice = createSlice({
  name: 'externals',
  initialState: INITIAL_EXTERNALS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadExternalsThunk.pending, (state, action) => {
        if (state.kind !== action.meta.arg) state.items = []
        state.kind = action.meta.arg
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadExternalsThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(loadExternalsThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudo cargar el listado.'
      })
      // guardar, cambiar el estado y borrar: mientras uno corre no se acepta otro; ojo: los matchers van después de todos los addCase
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.pending)), (state) => {
        state.saving = true
      })
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.fulfilled)), (state, action) => {
        state.saving = false
        state.items = action.payload as typeof state.items
        state.status = 'succeeded'
      })
      .addMatcher(isAnyOf(...changes.map((thunk) => thunk.rejected)), (state) => {
        state.saving = false
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_EXTERNALS_STATE
      )
  },
})

export const externalsReducer = externalsSlice.reducer
export default externalsSlice.reducer
