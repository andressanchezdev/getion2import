// orders.slice · estado de la vista de pedidos (clave 'orders'): etapa, canal y búsqueda elegidos, conteos, tabla y pedido abierto con su detalle
// conecta con: orders.thunks (la llenan), orders.selectors (lecturas), navigation (al cambiar de bodega se limpia) y rootReducer (clave 'orders'; NO se guarda en el navegador)
// ojo: cambiar de etapa o de canal cierra el pedido abierto, porque la tabla cambia
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { setActiveWarehouse } from '@/features/navigation'
import { logoutThunk } from '@/features/auth'
import { INITIAL_ORDERS_STATE } from '../constants/orders.constants'
import { cancelOrderThunk, loadOrderCountsThunk, loadOrderDetailThunk, loadOrdersThunk } from '../thunks/orders.thunks'
import type { OrderChannelFilter, OrderStageKey } from '../types/orders.types'

export const ordersSlice = createSlice({
  name: 'orders',
  initialState: INITIAL_ORDERS_STATE,
  reducers: {
    setOrderStage: (state, action: PayloadAction<OrderStageKey>) => {
      state.stage = action.payload
      state.openId = null
    },
    setOrderChannel: (state, action: PayloadAction<OrderChannelFilter>) => {
      state.channel = action.payload
      state.openId = null
    },
    setOrderQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    openOrder: (state, action: PayloadAction<number>) => {
      if (state.openId === action.payload) return // ojo: ya está abierto; si se limpiara el detalle no se volvería a pedir
      state.openId = action.payload
      state.detail = INITIAL_ORDERS_STATE.detail
    },
    closeOrder: (state) => {
      state.openId = null
      state.detail = INITIAL_ORDERS_STATE.detail
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrderCountsThunk.fulfilled, (state, action) => {
        state.counts = action.payload
      })
      .addCase(loadOrdersThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadOrdersThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return // respuesta de una petición anterior: se descarta
        state.list.items = action.payload.items
        state.list.capped = action.payload.capped
        state.list.status = 'succeeded'
      })
      .addCase(loadOrdersThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar los pedidos.'
      })
      .addCase(loadOrderDetailThunk.pending, (state, action) => {
        state.detail.status = 'loading'
        state.detail.error = null
        state.detail.requestId = action.meta.requestId
      })
      .addCase(loadOrderDetailThunk.fulfilled, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.data = action.payload
        state.detail.status = 'succeeded'
      })
      .addCase(loadOrderDetailThunk.rejected, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.status = 'failed'
        state.detail.error = action.payload ?? 'No se pudo cargar el detalle del pedido.'
      })
      // un pedido anulado deja de estar en la tabla: si era el abierto, se cierra su detalle
      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        if (state.openId !== action.meta.arg.saleId) return
        state.openId = null
        state.detail = INITIAL_ORDERS_STATE.detail
      })
      // otra bodega o cerrar sesión: se empieza de cero
      .addMatcher(isAnyOf(setActiveWarehouse, logoutThunk.fulfilled), () => INITIAL_ORDERS_STATE)
  },
})

export const { setOrderStage, setOrderChannel, setOrderQuery, openOrder, closeOrder } = ordersSlice.actions
export const ordersReducer = ordersSlice.reducer
export default ordersSlice.reducer
