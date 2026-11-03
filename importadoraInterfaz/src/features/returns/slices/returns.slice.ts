// returns.slice · estado de la vista de devoluciones (clave 'returns'): lista, carga, error y filtros de bodega, estado y búsqueda
// conecta con: returns.thunks (la llenan), returns.selectors (lecturas) y rootReducer (clave 'returns'; NO se guarda en el navegador)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_RETURNS_STATE } from '../constants/returns.constants'
import { loadReturnsThunk } from '../thunks/returns.thunks'
import type { ReturnStatusFilter } from '../types/returns.types'

export const returnsSlice = createSlice({
  name: 'returns',
  initialState: INITIAL_RETURNS_STATE,
  reducers: {
    setReturnsWarehouse: (state, action: PayloadAction<number | null>) => {
      state.warehouseId = action.payload
    },
    setReturnsStatus: (state, action: PayloadAction<ReturnStatusFilter>) => {
      state.status = action.payload
    },
    setReturnsQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    clearReturnsFilters: (state) => {
      state.warehouseId = null
      state.status = 'all'
      state.query = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadReturnsThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadReturnsThunk.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(loadReturnsThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'No se pudieron cargar las devoluciones.'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_RETURNS_STATE)
  },
})

export const { setReturnsWarehouse, setReturnsStatus, setReturnsQuery, clearReturnsFilters } = returnsSlice.actions
export const returnsReducer = returnsSlice.reducer
