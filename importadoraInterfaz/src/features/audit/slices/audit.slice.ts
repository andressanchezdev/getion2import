// audit.slice · estado de la auditoría: filtros, página y la lista que llegó del backend
// conecta con: audit.thunks (lo llenan), audit.selectors (lecturas), useAuditLog (cambia filtros y página) y rootReducer (clave 'audit'; NO se guarda en el navegador)
// ojo: se vacía al cerrar sesión; al saltar de compañía rootReducer lo reinicia; cambiar los filtros vuelve a la página 1
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_AUDIT_STATE } from '../constants/audit.constants'
import { loadAuditThunk } from '../thunks/audit.thunks'
import type { AuditFilters } from '../types/audit.types'

export const auditSlice = createSlice({
  name: 'audit',
  initialState: INITIAL_AUDIT_STATE,
  reducers: {
    setAuditFilters: (state, action: PayloadAction<AuditFilters>) => {
      state.filters = action.payload
      state.page = 1
    },
    setAuditPage: (state, action: PayloadAction<number>) => {
      state.page = Math.max(1, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAuditThunk.pending, (state, action) => {
        state.list.status = 'loading'
        state.list.error = null
        state.list.requestId = action.meta.requestId
      })
      .addCase(loadAuditThunk.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = action.payload.items
        state.list.meta = action.payload.meta
        state.list.status = 'succeeded'
      })
      .addCase(loadAuditThunk.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.items = []
        state.list.meta = null
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'No se pudo cargar la auditoría.'
      })
      .addCase(logoutThunk.fulfilled, () => INITIAL_AUDIT_STATE)
  },
})

export const { setAuditFilters, setAuditPage } = auditSlice.actions
export const auditReducer = auditSlice.reducer
