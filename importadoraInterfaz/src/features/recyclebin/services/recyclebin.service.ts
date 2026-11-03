// recyclebin.service.ts · llamadas HTTP para la papelera de reciclaje y restauración
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RecycleBinFilters, RecycleBinItem } from '../types/recyclebin.types'

const { RECYCLE_BIN } = API_CONFIG.ENDPOINTS

export const fetchRecycleBin = async (
  filters?: RecycleBinFilters
): Promise<APIResponse<RecycleBinItem[]>> => {
  const { data } = await apiClient.get<APIResponse<RecycleBinItem[]>>(RECYCLE_BIN.LIST, {
    params: {
      table: filters?.table || undefined,
      isRestored: filters?.isRestored,
      q: filters?.search || undefined,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 20,
    },
  })
  return data
}

export const restoreRecycleBinItem = async (id: number): Promise<void> => {
  await apiClient.post(RECYCLE_BIN.RESTORE(id))
}

