// companies.slice · estado de las compañías registradas: lista, estado de carga y error
// conecta con: companies.thunks (lo llena), companies.selectors (lecturas) y rootReducer (clave 'companies'; NO se guarda en el navegador)
// ojo: rootReducer NO lo vacía al saltar de compañía (la lista de compañías no cambia); sí se vacía al cerrar sesión
import { applyVersionedStatus, mergeVersionedList } from '@/global/helpers/realtime/applyVersioned'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_COMPANIES_STATE } from '../constants/companies.constants'
import { loadCompaniesThunk } from '../thunks/companies.thunks'

export const companiesSlice = createSlice({
  name: 'companies',
  initialState: INITIAL_COMPANIES_STATE,
  reducers: {
    // tiempo real (entity.status_changed de compañía): cambia el estado de la fila si ya está cargada
    companyStatusFromEvent: (state, action: PayloadAction<{ id: number; isActive: boolean; version?: string }>) => {
      const row = state.items.find((company) => company.id === action.payload.id)
      if (row) applyVersionedStatus(row, action.payload.isActive, action.payload.version)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCompaniesThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadCompaniesThunk.fulfilled, (state, action) => {
        state.items = mergeVersionedList(state.items, action.payload, (c) => c.id)
        state.status = 'succeeded'
      })
      .addCase(loadCompaniesThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron cargar las compañías.'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_COMPANIES_STATE)
  },
})

export const { companyStatusFromEvent } = companiesSlice.actions
export const companiesReducer = companiesSlice.reducer
export default companiesSlice.reducer
