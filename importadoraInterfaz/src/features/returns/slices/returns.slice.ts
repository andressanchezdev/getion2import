// returns.slice · estado de la vista de devoluciones (clave 'returns'): lista, carga, error y filtros de bodega, estado y búsqueda
// conecta con: returns.thunks (la llenan), returns.selectors (lecturas) y rootReducer (clave 'returns'; NO se guarda en el navegador)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_RETURNS_STATE } from '../constants/returns.constants'
import { loadReturnsThunk } from '../thunks/returns.thunks'
import type { ReturnDto, ReturnStatus, ReturnStatusFilter } from '../types/returns.types'

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
    // tiempo real (return.created): la devolución entra arriba si es de la bodega del filtro (o no hay filtro); una repetida no se duplica
    returnCreatedFromEvent: (state, action: PayloadAction<ReturnDto>) => {
      const created = action.payload
      if (state.warehouseId !== null && created.warehouseId !== state.warehouseId) return
      if (state.items.some((item) => item.id === created.id)) return
      state.items.unshift(created)
    },
    // tiempo real (return.status_changed): aprobada o rechazada, con quién la resolvió
    returnStatusFromEvent: (state, action: PayloadAction<{ id: number; to: ReturnStatus; by: string }>) => {
      const row = state.items.find((item) => item.id === action.payload.id)
      if (!row) return
      row.status = action.payload.to
      row.approvedByName = action.payload.by
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

export const { setReturnsWarehouse, setReturnsStatus, setReturnsQuery, clearReturnsFilters, returnCreatedFromEvent, returnStatusFromEvent } = returnsSlice.actions
export const returnsReducer = returnsSlice.reducer
