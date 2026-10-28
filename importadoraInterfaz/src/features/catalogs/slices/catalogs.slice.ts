// catalogs.slice · estado de los catálogos (marcas, categorías y modelos): lista, estado de carga y último error de cada uno
// conecta con: catalogs.thunks (los llenan), catalogs.selectors (las lecturas) y rootReducer (clave 'catalogs'; no se persiste: se pide una vez por sesión)
import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_CATALOGS_STATE } from '../constants/catalogs.constants'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from '../thunks/catalogs.thunks'

export const catalogsSlice = createSlice({
  name: 'catalogs',
  initialState: INITIAL_CATALOGS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // marcas
      .addCase(fetchBrandsThunk.pending, (state) => {
        state.brands.status = 'loading'
        state.brands.error = null
      })
      .addCase(fetchBrandsThunk.fulfilled, (state, action) => {
        state.brands = { items: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchBrandsThunk.rejected, (state, action) => {
        state.brands.status = 'failed'
        state.brands.error = action.payload ?? 'No se pudo cargar el catálogo.'
      })
      // categorías
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.categories.status = 'loading'
        state.categories.error = null
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.categories = { items: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.categories.status = 'failed'
        state.categories.error = action.payload ?? 'No se pudo cargar el catálogo.'
      })
      // modelos de moto
      .addCase(fetchMotoModelsThunk.pending, (state) => {
        state.models.status = 'loading'
        state.models.error = null
      })
      .addCase(fetchMotoModelsThunk.fulfilled, (state, action) => {
        state.models = { items: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchMotoModelsThunk.rejected, (state, action) => {
        state.models.status = 'failed'
        state.models.error = action.payload ?? 'No se pudo cargar el catálogo.'
      })
  },
})

export const catalogsReducer = catalogsSlice.reducer
export default catalogsSlice.reducer
