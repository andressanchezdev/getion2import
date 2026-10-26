// management.slice · estado de pedidos por etapa: etapa elegida, datos, estado y error
// conecta con: management.thunks (lo llena), management.selectors (lecturas) y rootReducer (clave 'management'; NO se guarda en el navegador)
// ojo: descarta respuestas de cargas anteriores (requestId); al cerrar sesión se olvida todo
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_MANAGEMENT_STATE, INITIAL_ORDERS_STATE } from '../constants/management.constants'
import { loadPipelineThunk, loadStageOrdersThunk } from '../thunks/management.thunks'
import type { StageKey } from '../types/management.types'

export const managementSlice = createSlice({
  name: 'management',
  initialState: INITIAL_MANAGEMENT_STATE,
  reducers: {
    // al cambiar de etapa se olvida el canal y la lista (eran de la etapa anterior)
    selectStage: (state, action: PayloadAction<StageKey>) => {
      state.selected = action.payload
      state.channel = null
      state.orders = INITIAL_ORDERS_STATE
    },
    selectChannel: (state, action: PayloadAction<string | null>) => {
      state.channel = action.payload
      state.orders = INITIAL_ORDERS_STATE
    },
    setOrdersPage: (state, action: PayloadAction<number>) => {
      state.orders.page = Math.max(1, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPipelineThunk.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(loadPipelineThunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.data = action.payload
        state.status = 'succeeded'
      })
      .addCase(loadPipelineThunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron cargar los pedidos por etapa.'
      })
      .addCase(loadStageOrdersThunk.pending, (state, action) => {
        state.orders.status = 'loading'
        state.orders.error = null
        state.orders.requestId = action.meta.requestId
      })
      .addCase(loadStageOrdersThunk.fulfilled, (state, action) => {
        if (state.orders.requestId !== action.meta.requestId) return
        state.orders.items = action.payload.items
        state.orders.meta = action.payload.meta
        state.orders.status = 'succeeded'
      })
      .addCase(loadStageOrdersThunk.rejected, (state, action) => {
        if (state.orders.requestId !== action.meta.requestId) return
        state.orders.status = 'failed'
        state.orders.error = action.payload ?? 'No se pudieron cargar los pedidos de esta etapa.'
      })
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_MANAGEMENT_STATE
      )
  },
})

export const { selectStage, selectChannel, setOrdersPage } = managementSlice.actions
export const managementReducer = managementSlice.reducer
export default managementSlice.reducer
