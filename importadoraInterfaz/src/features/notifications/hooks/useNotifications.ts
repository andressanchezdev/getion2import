// useNotifications.ts · hook de estado para listar y marcar notificaciones como leídas
// ojo: solo los empleados y administradores reciben notificaciones; para el superadmin no se consulta ni se sondea (la API responde 403)
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { toast } from '@/global/helpers/feedback/toast'
import type { AppNotification } from '../types/notifications.types'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications.service'

export const useNotifications = () => {
  const user = useAppSelector(selectCurrentUser)
  const canReceive = Boolean(user) && user?.userType !== 'superadmin'
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const seenNotificationIds = useRef(new Set<number>())
  const hasLoadedNotifications = useRef(false)

  const loadNotifications = useCallback(async () => {
    if (!canReceive) {
      setNotifications([])
      seenNotificationIds.current.clear()
      hasLoadedNotifications.current = false
      return
    }
    setLoading(true)
    try {
      const res = await fetchNotifications(false)
      const current = res.data ?? []
      if (hasLoadedNotifications.current) {
        current
          .filter((notification) => notification.kind === 'restore_record' && !notification.readAt && !seenNotificationIds.current.has(notification.id))
          .forEach((notification) => toast.warning(notification.title, { description: notification.body ?? 'El SUPERADMIN restauró un registro.' }))
      }
      current.forEach((notification) => seenNotificationIds.current.add(notification.id))
      hasLoadedNotifications.current = true
      setNotifications(current)
    } catch {
      // silencioso para no interrumpir el flujo si la sesión expira
    } finally {
      setLoading(false)
    }
  }, [canReceive])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void loadNotifications()
    })
    const intervalId = window.setInterval(() => {
      if (!cancelled) void loadNotifications()
    }, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [loadNotifications])

  const unreadCount = notifications.filter((n) => !n.readAt).length

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
    } catch {
      // fallo silencioso
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      )
    } catch {
      // fallo silencioso
    }
  }

  return {
    canReceive,
    notifications,
    unreadCount,
    loading,
    isOpen,
    setIsOpen,
    loadNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
  }
}
