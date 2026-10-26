// suppliers.slice · estado de proveedores: lista paginada con búsqueda, y totales
// conecta con: suppliers.thunks (lo llenan), suppliers.selectors (lecturas) y rootReducer (clave 'suppliers'; NO se guarda en el navegador)
// ojo: al cambiar la búsqueda se vuelve a la página 1; la lista descarta respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_SUPPLIERS_STATE } from '../constants/suppliers.constants'
import { loadSuppliersSummaryThunk, loadSuppliersThunk } from '../thunks/suppliers.thunks'

export const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState: INITIAL_SUPPLIERS_STATE,
  reducers: {
    setSuppliersPage: (state, action: PayloadAction<number>) => {
      state.page = Math.max(1, action.payload)
    },
    setSuppliersQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
      state.page = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSuppliersThunk.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadSuppliersThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = action.payload.items
        state.meta = action.payload.meta
        state.status = 'succeeded'
      })
      .addCase(loadSuppliersThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron cargar los proveedores.'
      })
      .addCase(loadSuppliersSummaryThunk.pending, (state) => {
        state.summary.status = 'loading'
        state.summary.error = null
      })
      .addCase(loadSuppliersSummaryThunk.fulfilled, (state, action) => {
        state.summary.data = action.payload
        state.summary.status = 'succeeded'
      })
      .addCase(loadSuppliersSummaryThunk.rejected, (state, action) => {
        state.summary.status = 'failed'
        state.summary.error = action.payload ?? 'No se pudieron cargar los totales de proveedores.'
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_SUPPLIERS_STATE
      )
  },
})

export const { setSuppliersPage, setSuppliersQuery } = suppliersSlice.actions
export const suppliersReducer = suppliersSlice.reducer
export default suppliersSlice.reducer
