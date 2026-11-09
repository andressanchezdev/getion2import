// backups.service.ts · llamadas a la API para la gestión de respaldos de PostgreSQL
import { ADMIN_ENDPOINTS } from '@/api/endpoints/admin.endpoints'
import { apiClient } from '@/api/http/client'

export interface BackupItem {
  id: string
  fileName: string
  sizeBytes: number
  kind: 'manual' | 'pre_restore'
  note?: string
  createdByType?: string
  createdByEmail?: string
  createdAt: string
  isLatest?: boolean
}

export const backupsService = {
  async list(): Promise<BackupItem[]> {
    const res = await apiClient.get<{ data: BackupItem[] }>(ADMIN_ENDPOINTS.BACKUPS.LIST)
    return res.data?.data ?? []
  },

  async create(note?: string): Promise<BackupItem> {
    const res = await apiClient.post<{ data: BackupItem }>(ADMIN_ENDPOINTS.BACKUPS.CREATE, { note: note || 'Copia manual generada desde Configuración' })
    return res.data?.data
  },

  async download(id: string, fileName?: string): Promise<void> {
    const res = await apiClient.get(ADMIN_ENDPOINTS.BACKUPS.DOWNLOAD(id), { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName || `backup-${id}.dump`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  async restore(id: string, reason: string): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.BACKUPS.RESTORE(id), { reason })
  },
}

