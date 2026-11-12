// superadmin.thunks · carga la lista de administradores con los filtros del estado, los activa o desactiva y guarda (crear o editar, con empresa nueva si hace falta)
// conecta con: superadmin.service (llamadas) y superadmin.slice (reacciona); las despachan useSuperadminAdmins y useAdminForm
// ojo: guardar o cambiar el estado recarga la lista con los mismos filtros; una empresa nueva se crea antes que su administrador
import { isRealtimeLive } from '@/features/realtime/helpers/realtime.guards'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type Paginated } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import { createAdmin, createCompany, listAdmins, updateAdmin } from '../services/superadmin.service'
import type { AdminUser, SaveAdminInput, SuperadminState } from '../types/superadmin.types'

type Config = { state: { superadmin: SuperadminState }; rejectValue: string }

export const loadAdminsThunk = createAsyncThunk<Paginated<AdminUser>, void, Config>('superadmin/load', async (_, { getState, rejectWithValue }) => {
  try {
    return await listAdmins(getState().superadmin.filters)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los administradores.'))
  }
})

export const toggleAdminStatusThunk = createAsyncThunk<void, { admin: AdminUser; reason?: string }, Config>('superadmin/toggle', async ({ admin, reason }, { dispatch, getState, rejectWithValue }) => {
  const next = !admin.isActive
  try {
    await updateAdmin(admin.id, { isActive: next, reason })
    toast.success(`Administrador ${admin.fullName || admin.email} ${next ? 'activado' : 'desactivado'}.`)
    // en vivo, entity.created / updated / status_changed dejan la tabla al día (masterData.realtime y superadmin.realtime)
    if (!isRealtimeLive(getState())) await dispatch(loadAdminsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'Error al cambiar el estado del administrador.')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const saveAdminThunk = createAsyncThunk<void, SaveAdminInput, Config>('superadmin/save', async (input, { dispatch, getState, rejectWithValue }) => {
  try {
    if ('update' in input) {
      await updateAdmin(input.adminId, input.update)
      toast.success('Administrador actualizado correctamente.')
    } else {
      const companyId = 'newCompany' in input ? (await createCompany(input.newCompany)).id : input.companyId
      await createAdmin({ ...input.create, companyId })
      toast.success('Administrador creado exitosamente.')
    }
    // en vivo, entity.created / updated / status_changed dejan la tabla al día (masterData.realtime y superadmin.realtime)
    if (!isRealtimeLive(getState())) await dispatch(loadAdminsThunk())
  } catch (error) {
    const message = getErrorMessage(error, 'No se pudo guardar el administrador.')
    toast.error(message)
    return rejectWithValue(message)
  }
})
