// notifications.types.ts · tipos para el sistema de notificaciones del empleado
export type NotificationKind = 'info' | 'success' | 'warning' | 'error' | 'restore_record'

export interface AppNotification {
  id: number
  employeeId?: number
  adminId?: number
  kind: NotificationKind
  title: string
  body?: string | null
  entity?: string | null
  entityId?: number | null
  readAt?: string | null
  createdAt: string
}
