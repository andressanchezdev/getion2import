// externals.service · llamadas al backend de proveedores y transportadoras: listar, crear, editar (también el estado) y borrar
// conecta con: api/client y api/config (rutas); las usa externals.thunks
// ojo: la lista se pide con el tipo (kind) y de una sola vez; buscar y filtrar por estado se hace en pantalla sobre lo cargado
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { EXTERNALS_LOAD_SIZE } from '../constants/externals.constants'
import type { CreateExternalPayload, ExternalEntity, ExternalKind, UpdateExternalPayload } from '../types/externals.types'

const { EXTERNALS } = API_CONFIG.ENDPOINTS

// los proveedores o transportadoras de la compañía
export const getExternals = async (kind: ExternalKind): Promise<ExternalEntity[]> => {
  const { data } = await apiClient.get<APIResponse<ExternalEntity[] | null>>(EXTERNALS.LIST, { params: { kind, page: 1, pageSize: EXTERNALS_LOAD_SIZE } })
  return data.data ?? []
}

// registra un proveedor o una transportadora
export const createExternal = async (payload: CreateExternalPayload): Promise<void> => {
  await apiClient.post(EXTERNALS.LIST, payload)
}

// cambia datos o estado (con { isActive })
export const updateExternal = async (id: number, payload: UpdateExternalPayload): Promise<void> => {
  await apiClient.put(EXTERNALS.BY_ID(id), payload)
}

// borra un registro
export const deleteExternal = async (id: number, reason: string): Promise<void> => {
  await apiClient.delete(EXTERNALS.BY_ID(id), { data: { reason } })
}
