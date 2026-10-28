// customers.slice · estado de clientes: lista paginada, cliente abierto, su detalle, sus direcciones y sus descuentos
// conecta con: customers.thunks y customers.details.thunks (lo llenan), customers.selectors (lecturas) y rootReducer (clave 'customers'; NO se guarda en el navegador)
// ojo: al abrir otro cliente se limpian detalle, direcciones y descuentos para no mostrar por un instante los del anterior
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_CUSTOMERS_STATE } from '../constants/customers.constants'
import { loadCustomerDetailThunk, loadCustomersThunk } from '../thunks/customers.thunks'
import {
  addDirectionThunk,
  deleteDirectionThunk,
  deleteDiscountThunk,
  loadDirectionsThunk,
  loadDiscountsThunk,
} from '../thunks/customers.details.thunks'

const directionChanges = [addDirectionThunk, deleteDirectionThunk] as const

export const customersSlice = createSlice({
  name: 'customers',
  initialState: INITIAL_CUSTOMERS_STATE,
  reducers: {
    setCustomersPage: (state, action: PayloadAction<number>) => {
      state.list.page = Math.max(1, action.payload)
    },
    setCustomersQuery: (state, action: PayloadAction<string>) => {
      state.list.query = action.payload
    },
    // abre (o cierra con null) el panel de un cliente
    selectCustomer: (state, action: PayloadAction<number | null>) => {
      if (state.selectedId === action.payload) return
      state.selectedId = action.payload
      state.detail = INITIAL_CUSTOMERS_STATE.detail
      state.directions = INITIAL_CUSTOMERS_STATE.directions
      state.discounts = INITIAL_CUSTOMERS_STATE.discounts
    },
  },
  extraReducers: (builder) => {
    builder
      // lista
      .addCase(loadCustomersThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadCustomersThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload.customers
        state.list.meta = action.payload.meta
        state.list.status = 'succeeded'
      })
      .addCase(loadCustomersThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudieron cargar los clientes.'
      })
      // detalle
      .addCase(loadCustomerDetailThunk.pending, (state, action) => {
        state.detail.status = 'loading'
        state.detail.error = null
        state.detail.requestId = action.meta.requestId
      })
      .addCase(loadCustomerDetailThunk.fulfilled, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.data = action.payload
        state.detail.status = 'succeeded'
      })
      .addCase(loadCustomerDetailThunk.rejected, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return
        state.detail.status = 'failed'
        state.detail.error = action.payload ?? 'No se pudo cargar el cliente.'
      })
      // direcciones
      .addCase(loadDirectionsThunk.pending, (state) => {
        state.directions.status = 'loading'
        state.directions.error = null
      })
      .addCase(loadDirectionsThunk.fulfilled, (state, action) => {
        state.directions.items = action.payload
        state.directions.status = 'succeeded'
      })
      .addCase(loadDirectionsThunk.rejected, (state, action) => {
        state.directions.status = 'failed'
        state.directions.error = action.payload ?? 'No se pudieron cargar las direcciones.'
      })
      // descuentos
      .addCase(loadDiscountsThunk.pending, (state) => {
        state.discounts.status = 'loading'
        state.discounts.error = null
      })
      .addCase(loadDiscountsThunk.fulfilled, (state, action) => {
        state.discounts.items = action.payload
        state.discounts.status = 'succeeded'
      })
      .addCase(loadDiscountsThunk.rejected, (state, action) => {
        state.discounts.status = 'failed'
        state.discounts.error = action.payload ?? 'No se pudieron cargar los descuentos.'
      })
      .addCase(deleteDiscountThunk.pending, (state) => {
        state.discounts.saving = true
      })
      .addCase(deleteDiscountThunk.fulfilled, (state, action) => {
        state.discounts.saving = false
        state.discounts.items = action.payload
        state.discounts.status = 'succeeded'
      })
      .addCase(deleteDiscountThunk.rejected, (state) => {
        state.discounts.saving = false
      })
      // cambios de direcciones (agregar o borrar): mientras uno corre no se acepta otro; ojo: los matchers van después de todos los addCase
      .addMatcher(isAnyOf(...directionChanges.map((thunk) => thunk.pending)), (state) => {
        state.directions.saving = true
      })
      .addMatcher(isAnyOf(...directionChanges.map((thunk) => thunk.fulfilled)), (state, action) => {
        state.directions.saving = false
        state.directions.items = action.payload as typeof state.directions.items
        state.directions.status = 'succeeded'
      })
      .addMatcher(isAnyOf(...directionChanges.map((thunk) => thunk.rejected)), (state) => {
        state.directions.saving = false
      })
      // al cerrar sesión se olvida todo lo de este usuario (se detecta por el nombre de la acción para no depender en tiempo de ejecución de auth)
      .addMatcher(
        (action) => action.type === 'auth/logout/fulfilled',
        () => INITIAL_CUSTOMERS_STATE
      )
  },
})

export const { setCustomersPage, setCustomersQuery, selectCustomer } = customersSlice.actions
export const customersReducer = customersSlice.reducer
export default customersSlice.reducer
