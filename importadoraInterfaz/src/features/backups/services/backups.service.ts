// backups.service.ts · llamadas HTTP de los respaldos de la base: listar, crear, descargar y restaurar
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { Backup, RestoreResult } from '../types/backups.types'

const { BACKUPS } = API_CONFIG.ENDPOINTS

export const fetchBackups = async (): Promise<Backup[]> => {
  const { data } = await apiClient.get<APIResponse<Backup[]>>(BACKUPS.LIST)
  return data.data ?? []
}

// genera un respaldo completo ahora mismo (puede tardar según el tamaño de la base)
export const createBackup = async (note: string): Promise<Backup> => {
  const { data } = await apiClient.post<APIResponse<Backup>>(BACKUPS.CREATE, { note }, { timeout: 0 })
  return data.data
}

// baja el archivo .dump como Blob para guardarlo en el equipo
export const downloadBackup = async (id: string): Promise<Blob> => {
  const response = await apiClient.get<Blob>(BACKUPS.DOWNLOAD(id), { responseType: 'blob', timeout: 0 })
  return response.data
}

// vuelve toda la base al estado del respaldo (guarda antes un respaldo de seguridad del estado actual)
export const restoreBackup = async (id: string, reason: string): Promise<RestoreResult> => {
  const { data } = await apiClient.post<APIResponse<RestoreResult>>(BACKUPS.RESTORE(id), { reason }, { timeout: 0 })
  return data.data
}
