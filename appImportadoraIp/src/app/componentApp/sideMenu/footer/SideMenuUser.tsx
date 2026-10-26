// SideMenuUser · tarjeta del usuario en el footer del menú (avatar con iniciales, nombre, rol y botón de cerrar sesión)
// conecta con: features/auth (usuario de la sesión y logoutThunk); las iniciales salen de global/helpers/format; la confirmación es global/.../ConfirmDialog
// ojo: antes el usuario salía del estado ui con datos fijos; ahora sale de la sesión (login)
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { getInitials } from '@/global/helpers/format'
import { ConfirmDialog } from '@/global/components/UI/molecules/ConfirmDialog'
import { getDisplayName, logoutThunk, selectCurrentUser } from '@/features/auth'
import logoutIcon from '@/assets/icons/logout.svg'
import './SideMenuUser.css'

export const SideMenuUser: React.FC = () => {
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectCurrentUser)
    const [showConfirm, setShowConfirm] = useState(false)

    if (!user) return null

    const displayName = getDisplayName(user)

    const handleConfirmLogout = () => {
        setShowConfirm(false)
        dispatch(logoutThunk('manual'))
    }

    return (
        <>
            <div className="side-menu-user">
                <div className="side-menu-user-avatar" aria-hidden="true">
                    {getInitials(displayName)}
                </div>
                <div className="side-menu-user-info">
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
            </div>

            {/* ojo: el diálogo ahora es el ConfirmDialog global; aquí solo se le dan los textos y qué hacer al confirmar */}
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
