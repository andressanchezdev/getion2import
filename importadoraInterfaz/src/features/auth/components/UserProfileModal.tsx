// UserProfileModal · modal con el perfil completo del usuario activo y sus permisos
// conecta con: auth/thunks (fetchCurrentUserThunk para refrescar con GET /auth/me) y auth/selectors
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { getInitials } from '@/global/helpers/formatting/format'
import { getDisplayName } from '../helpers/auth.helpers'
import { selectCurrentUser } from '../selectors/auth.selectors'
import { fetchCurrentUserThunk } from '../thunks/auth.thunks'
import type { AuthUser } from '../types/auth.types'
import './UserProfileModal.css'

interface UserProfileModalProps {
  open: boolean
  onClose: () => void
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser) as AuthUser | null
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!open || !user) return null

  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await dispatch(fetchCurrentUserThunk()).unwrap()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="user-profile-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="user-profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="user-profile-modal-header">
          <h3 className="user-profile-modal-title">Perfil de Usuario</h3>
          <button
            type="button"
            className="user-profile-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="user-profile-modal-body">
          <div className="user-profile-hero">
            <div className="user-profile-avatar-large" aria-hidden="true">
              {initials}
            </div>
            <div className="user-profile-hero-info">
              <h4>{displayName}</h4>
              <span className="user-profile-badge-role">{user.userType}</span>
            </div>
          </div>

          <div className="user-profile-grid">
            <div className="user-profile-field">
              <span className="user-profile-field-label">Correo Electrónico</span>
              <span className="user-profile-field-value">{user.email || '—'}</span>
            </div>

            <div className="user-profile-field">
              <span className="user-profile-field-label">Documento</span>
              <span className="user-profile-field-value">{user.identification || '—'}</span>
            </div>

            <div className="user-profile-field">
              <span className="user-profile-field-label">Empresa</span>
              <span className="user-profile-field-value">
                {user.companyInformation?.businessName || (user.companyId ? `Empresa #${user.companyId}` : 'Global')}
              </span>
            </div>

            <div className="user-profile-field">
              <span className="user-profile-field-label">Sede / Bodega</span>
              <span className="user-profile-field-value">
                {user.warehouseId ? `Sede #${user.warehouseId}` : 'Sin sede asignada'}
              </span>
            </div>
          </div>

          {user.permissions && user.permissions.length > 0 && (
            <div className="user-profile-permissions-section">
              <span className="user-profile-field-label">
                Permisos Activos ({user.permissions.length})
              </span>
              <div className="user-profile-permissions-list">
                {user.permissions.map((perm: string) => (
                  <span key={perm} className="user-profile-permission-tag">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile-modal-footer">
          <button
            type="button"
            className="user-profile-btn user-profile-btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Actualizando...' : 'Refrescar (GET /auth/me)'}
          </button>
          <button
            type="button"
            className="user-profile-btn user-profile-btn-primary"
            onClick={onClose}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfileModal
