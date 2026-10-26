// LoginActions · botones del login: "Iniciar sesión" (envía el formulario) y "Registrarse"
// conecta con: LoginForm (le dice si está ingresando); el envío lo maneja el <form> con useLoginForm
// ojo: "Registrarse" todavía no tiene acción (igual que en importadora-online)
import React from 'react'
import { LOGIN_TEXTS } from '../../constants/auth.constants'
import type { LoginActionsProps } from '../../types/auth.login.types'
import './LoginActions.css'

export const LoginActions: React.FC<LoginActionsProps> = ({ isLoading }) => {
  return (
    <div className="login-actions">
      <button type="submit" className="login-actions-submit" disabled={isLoading}>
        {isLoading ? LOGIN_TEXTS.loginButtonLoading : LOGIN_TEXTS.loginButton}
      </button>
      <button type="button" className="login-actions-register">
        {LOGIN_TEXTS.registerButton}
      </button>
    </div>
  )
}

export default LoginActions
