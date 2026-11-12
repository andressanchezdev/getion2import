// catalogs.slice · estado de los catálogos (marcas, categorías y modelos): lista, estado de carga y último error de cada uno
// conecta con: catalogs.thunks (los llenan), catalogs.selectors (las lecturas) y rootReducer (clave 'catalogs'; no se persiste: se pide una vez por sesión)
import { applyVersionedStatus } from '@/global/helpers/realtime/applyVersioned'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_CATALOGS_STATE } from '../constants/catalogs.constants'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from '../thunks/catalogs.thunks'

export const catalogsSlice = createSlice({
  name: 'catalogs',
  initialState: INITIAL_CATALOGS_STATE,
  reducers: {
    // tiempo real (entity.status_changed de marca, categoría o modelo): cambia el estado de la fila si ya está cargada
    catalogStatusFromEvent: (state, action: PayloadAction<{ kind: 'brand' | 'category' | 'model'; id: number; isActive: boolean; version?: string }>) => {
      const { kind, id, isActive, version } = action.payload
      const list = kind === 'brand' ? state.brands.items : kind === 'category' ? state.categories.items : state.models.items
      const row = list.find((item) => item.id === id)
      if (row) applyVersionedStatus(row, isActive, version)
    },
  },
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

export const { catalogStatusFromEvent } = catalogsSlice.actions
export const catalogsReducer = catalogsSlice.reducer
export default catalogsSlice.reducer
