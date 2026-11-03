// superadmin.slice · estado de la gestión de administradores (clave 'superadmin'): lista, carga, paginación y filtros
// conecta con: superadmin.thunks (la llenan), superadmin.selectors (lecturas) y rootReducer (clave 'superadmin'; NO se guarda en el navegador)
// ojo: cualquier cambio de filtro vuelve a la página 1; la lista se pide al servidor (los filtros viajan en la petición)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_SUPERADMIN_STATE } from '../constants/superadmin.constants'
import { loadAdminsThunk } from '../thunks/superadmin.thunks'
import type { AdminStatusFilter } from '../types/superadmin.types'

export const superadminSlice = createSlice({
  name: 'superadmin',
  initialState: INITIAL_SUPERADMIN_STATE,
  reducers: {
    setAdminQuery: (state, action: PayloadAction<string>) => {
      state.filters.query = action.payload
      state.filters.page = 1
    },
    setAdminCompany: (state, action: PayloadAction<number | null>) => {
      state.filters.companyId = action.payload
      state.filters.page = 1
    },
    setAdminStatus: (state, action: PayloadAction<AdminStatusFilter>) => {
      state.filters.status = action.payload
      state.filters.page = 1
    },
    setAdminPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload
    },
    clearAdminFilters: (state) => {
      state.filters = INITIAL_SUPERADMIN_STATE.filters
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAdminsThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAdminsThunk.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.meta = action.payload.meta
      })
      .addCase(loadAdminsThunk.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload ?? 'No se pudieron cargar los administradores.'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_SUPERADMIN_STATE)
  },
})

export const { setAdminQuery, setAdminCompany, setAdminStatus, setAdminPage, clearAdminFilters } = superadminSlice.actions
export const superadminReducer = superadminSlice.reducer
