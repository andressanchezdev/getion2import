// SecurityTab · perfil del usuario en sesión y edición de su nombre, correo y clave de acceso
// conecta con: SettingsScreen (pestaña «seguridad») y useSecurityForm (estado y guardado); no habla con el API
import React from 'react'
import { useSecurityForm } from '../hooks/useSecurityForm'
import './SecurityTab.css'

export const SecurityTab: React.FC = () => {
  const form = useSecurityForm()
  const { user } = form
  return (
    <div className="security-tab-container">
      <div className="security-profile-card">
        <div className="sec-avatar-badge">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}</div>
        <div className="sec-profile-info">
          <div className="sec-profile-name-row">
            <h4>{user?.name || 'Usuario del Sistema'}</h4>
            <span className="sec-role-pill">{user?.userType || '—'}</span>
          </div>
          <p className="sec-profile-email">{user?.email || '—'}</p>
          <small className="sec-profile-detail">ID de Usuario: #{user?.userId ?? '—'} • Sesión Segura Activa</small>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); form.submit() }} className="security-form">
        <h5 className="sec-form-title">Editar Información Personal y Credenciales</h5>
        <div className="sec-form-row">
          <div className="sec-form-group">
            <label htmlFor="sec-name">Nombre Completo *</label>
            <input id="sec-name" type="text" value={form.name} onChange={(e) => form.setName(e.target.value)} placeholder="Tu nombre completo" required />
          </div>
          <div className="sec-form-group">
            <label htmlFor="sec-email">Correo Electrónico de Acceso *</label>
            <input id="sec-email" type="email" value={form.email} onChange={(e) => form.setEmail(e.target.value)} placeholder="tu.correo@empresa.com" required />
          </div>
        </div>

        <div className="sec-password-section">
          <h6 className="sec-password-subtitle">Actualizar Contraseña (Opcional)</h6>
          <p className="sec-password-note">Deja estos campos vacíos si solo deseas actualizar tu nombre o correo.</p>
          <div className="sec-form-row">
            <div className="sec-form-group">
              <label htmlFor="sec-new-pass">Nueva Contraseña</label>
              <input id="sec-new-pass" type="password" value={form.newPassword} onChange={(e) => form.setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="sec-form-group">
              <label htmlFor="sec-confirm-pass">Confirmar Nueva Contraseña</label>
              <input id="sec-confirm-pass" type="password" value={form.confirmPassword} onChange={(e) => form.setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
            </div>
          </div>
        </div>

        <div className="sec-form-actions">
          <button type="submit" className="sec-btn-save" disabled={form.saving}>
            {form.saving ? 'Guardando cambios...' : 'Guardar Cambios de Cuenta'}
          </button>
        </div>
      </form>
    </div>
  )
}
export default SecurityTab
