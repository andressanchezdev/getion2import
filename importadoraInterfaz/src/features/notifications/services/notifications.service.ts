// notifications.service.ts · llamadas HTTP para notificaciones
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { AppNotification } from '../types/notifications.types'

const { NOTIFICATIONS } = API_CONFIG.ENDPOINTS

export const fetchNotifications = async (unreadOnly = false): Promise<APIResponse<AppNotification[]>> => {
  const { data } = await apiClient.get<APIResponse<AppNotification[]>>(NOTIFICATIONS.LIST, {
    params: { unread: unreadOnly },
  })
  return data
}

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await apiClient.post(NOTIFICATIONS.MARK_READ(id))
}

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post(NOTIFICATIONS.MARK_ALL_READ)
}
