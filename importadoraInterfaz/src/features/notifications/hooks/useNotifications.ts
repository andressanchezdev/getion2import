// useNotifications.ts · hook de estado para listar y marcar notificaciones como leídas
import { useState, useCallback, useEffect } from 'react'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCurrentUser } from '@/features/auth'
import type { AppNotification } from '../types/notifications.types'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications.service'

export const useNotifications = () => {
  const user = useAppSelector(selectCurrentUser)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetchNotifications(false)
      setNotifications(res.data ?? [])
    } catch {
      // silencioso para no interrumpir el flujo si la sesión expira
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void loadNotifications()
    })
    return () => {
      cancelled = true
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

