// audit.thunks · pide al backend la página de auditoría que indican los filtros y la página del slice
// conecta con: audit.service (llamada), auth (selectRequestContext: compañía activa del superadmin o la del admin) y audit.slice (reacciona); la despacha useAuditLog
// ojo: lee la página y los filtros del slice (no por argumento) para que un cambio y la carga siempre vayan de acuerdo; el slice descarta respuestas de pedidos anteriores
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type Paginated } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { fetchAuditPage } from '../services/audit.service'
import type { AuditEntry, AuditState } from '../types/audit.types'

export const loadAuditThunk = createAsyncThunk<Paginated<AuditEntry>, void, { state: { auth: AuthState; audit: AuditState }; rejectValue: string }>('audit/load', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  try {
    return await fetchAuditPage(ctx, state.audit.page, state.audit.filters)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la auditoría.'))
  }
})
