// SideMenuUser · tarjeta del usuario en el footer del menú (avatar con iniciales, nombre, rol, modal de perfil y botón de cerrar sesión)
// conecta con: features/auth (usuario de la sesión, logoutThunk, UserProfileModal); las iniciales salen de global/helpers/format; la confirmación es global/.../ConfirmDialog; SideMenu le pasa si el menú está contraído
// ojo: antes el usuario salía del estado ui con datos fijos; ahora sale de la sesión (login)
// ojo: con el menú contraído solo se ve el avatar (como en la maqueta)
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { getInitials } from '@/global/helpers/formatting/format'
import { ConfirmDialog } from '@/global/components/UI/molecules/dialogs/ConfirmDialog'
import { getDisplayName, logoutThunk, selectCurrentUser, UserProfileModal } from '@/features/auth'
import logoutIcon from '@/assets/icons/logout.svg'
import './SideMenuUser.css'

interface SideMenuUserProps {
    isMini: boolean
}

export const SideMenuUser: React.FC<SideMenuUserProps> = ({ isMini }) => {
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectCurrentUser)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showProfile, setShowProfile] = useState(false)

    if (!user) return null

    const displayName = getDisplayName(user)

    const handleConfirmLogout = () => {
        setShowConfirm(false)
        dispatch(logoutThunk('manual'))
    }

    return (
        <>
            <div className={`side-menu-user ${isMini ? 'side-menu-user-mini' : ''}`}>
                <div
                    className="side-menu-user-avatar"
                    title={isMini ? `${displayName} - Ver perfil` : 'Ver perfil'}
                    aria-label="Ver perfil de usuario"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowProfile(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setShowProfile(true)
                        }
                    }}
                >
                    {getInitials(displayName)}
                </div>
                {!isMini && (
                    <>
                        <div
                            className="side-menu-user-info"
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowProfile(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setShowProfile(true)
                                }
                            }}
                            title="Ver perfil completo y permisos"
                            style={{ cursor: 'pointer' }}
                        >
                            <p className="side-menu-user-name">{displayName}</p>
                            <p className="side-menu-user-role">{user.userType}</p>
                        </div>
                        <button
                            type="button"
                            className="side-menu-user-logout"
                            onClick={() => setShowConfirm(true)}
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                        >
                            <img src={logoutIcon} alt="" className="side-menu-user-logout-icon" />
                        </button>
                    </>
                )}
            </div>

            {/* Modal de perfil del usuario y permisos en vivo */}
            <UserProfileModal
                open={showProfile}
                onClose={() => setShowProfile(false)}
            />

            {/* ConfirmDialog global de cierre de sesión */}
            <ConfirmDialog
                open={showConfirm}
                title="¿Cerrar sesión?"
                message="¿Estás seguro de que deseas salir del sistema?"
                onConfirm={handleConfirmLogout}
                onCancel={() => setShowConfirm(false)}
            />
        </>
    )
}

export default SideMenuUser
