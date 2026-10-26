// inventory.slice · estado del control de inventario: lista, página, búsqueda y filtro "solo con stock"
// conecta con: inventory.thunks (lo llena), inventory.selectors (lecturas) y rootReducer (clave 'inventory'; NO se guarda en el navegador)
// ojo: al cambiar la búsqueda o el filtro se vuelve a la página 1; descarta respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { loadInventoryThunk } from '../thunks/inventory.thunks'

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState: INITIAL_INVENTORY_STATE,
  reducers: {
    setInventoryPage: (state, action: PayloadAction<number>) => {
      state.page = Math.max(1, action.payload)
    },
    setInventoryQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
      state.page = 1
    },
    setInventoryOnlyInStock: (state, action: PayloadAction<boolean>) => {
      state.onlyInStock = action.payload
      state.page = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInventoryThunk.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadInventoryThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.items = action.payload.items
        state.meta = action.payload.meta
        state.status = 'succeeded'
      })
      .addCase(loadInventoryThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudo cargar el inventario.'
      })
      // al cerrar sesión se olvida todo (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_INVENTORY_STATE
      )
  },
})

export const { setInventoryPage, setInventoryQuery, setInventoryOnlyInStock } = inventorySlice.actions
export const inventoryReducer = inventorySlice.reducer
export default inventorySlice.reducer
