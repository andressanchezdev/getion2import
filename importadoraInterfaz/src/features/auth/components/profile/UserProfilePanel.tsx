// UserProfilePanel · perfil del usuario en sesión dentro del panel derecho: datos de la cuenta, empresa, sede y permisos activos
// conecta con: formRegistry (entrada «userProfile»), SideMenuUser (lo abre con openDrawerForm), auth (selectCurrentUser), navigation (closeDrawerForm), Pill y DrawerFormShell.css
// ojo: reemplaza al antiguo UserProfileModal; el ERP no usa modales flotantes para mostrar información: esa responsabilidad es del drawer derecho
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import { closeDrawerForm } from '@/features/navigation'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { getInitials } from '@/global/helpers/formatting/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { getDisplayName } from '../../helpers/auth.helpers'
import { selectCurrentUser } from '../../selectors/auth.selectors'
import './UserProfilePanel.css'

export const UserProfilePanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const close = () => dispatch(closeDrawerForm())

  if (!user) return null

  const displayName = getDisplayName(user)
  const facts: Array<[string, string]> = [
    ['Correo electrónico', user.email || '—'],
    ['Documento', user.identification || '—'],
    ['Empresa', user.companyInformation?.businessName || (user.companyId ? `Empresa #${user.companyId}` : 'Global')],
    ['Sede / Bodega', user.warehouseId ? `Sede #${user.warehouseId}` : 'Sin sede asignada'],
  ]
  const permissions = user.permissions ?? []

  return (
    <div className="drawer-form user-profile">
      <div className="drawer-form-body user-profile-body">
        <div className="user-profile-hero">
          <div className="user-profile-avatar" aria-hidden="true">{getInitials(displayName)}</div>
          <div className="user-profile-hero-info">
            <strong className="user-profile-name">{displayName}</strong>
            <Pill tone="blue">{user.userType}</Pill>
          </div>
        </div>

        <dl className="user-profile-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="user-profile-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {permissions.length > 0 && (
          <section className="drawer-form-section">
            <h4 className="drawer-form-section-title">Permisos activos ({permissions.length})</h4>
            <ul className="user-profile-permissions">
              {permissions.map((perm) => (
                <li key={perm} className="user-profile-permission">{perm}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={close}>Cerrar</button>
      </div>
    </div>
  )
}

export default UserProfilePanel
