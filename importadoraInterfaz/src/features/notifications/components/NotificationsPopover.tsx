// NotificationsPopover.tsx · campanita desplegable de notificaciones para el AppHeader
import React, { useRef, useEffect } from 'react'
import './NotificationsPopover.css'
import { formatDate } from '@/global/helpers/formatting/format'
import { Icon } from '@/global/components/UI/atoms/Icon'
import bellIcon from '@/assets/icons/bell.svg?raw'
import { useNotifications } from '../hooks/useNotifications'

export const NotificationsPopover: React.FC = () => {
  const {
    canReceive,
    notifications,
    unreadCount,
    loading,
    isOpen,
    setIsOpen,
    handleMarkAsRead,
    handleMarkAllAsRead,
  } = useNotifications()

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  // el superadmin no recibe notificaciones: no se pinta la campanita
  if (!canReceive) return null

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Icon svg={bellIcon} size="lg" />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h4 className="notif-title">Notificaciones</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-clear-btn"
                onClick={handleMarkAllAsRead}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty">Cargando notificaciones…</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">No tienes notificaciones pendientes.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.readAt ? 'is-unread' : ''}`}
                  onClick={() => !n.readAt && handleMarkAsRead(n.id)}
                >
                  <span className="notif-item-title">{n.title}</span>
                  {n.body && <span className="notif-item-body">{n.body}</span>}
                  <span className="notif-item-time">{formatDate(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsPopover

