// LoginOptions · fila bajo los campos: "Recordarme" y "¿Has olvidado tu contraseña?"
// conecta con: LoginForm (recordarme y su cambio); useLoginForm decide dónde se guarda la sesión
// ojo: "¿Has olvidado tu contraseña?" todavía no tiene acción (igual que en importadora-online)
import React from 'react'
import { LOGIN_TEXTS } from '../../constants/auth.constants'
import type { LoginOptionsProps } from '../../types/auth.login.types'
import './LoginOptions.css'

export const LoginOptions: React.FC<LoginOptionsProps> = ({ remember, onRememberChange }) => {
  return (
    <section className="login-options">
      <label className="login-options-remember">
        <input type="checkbox" checked={remember} onChange={(e) => onRememberChange(e.target.checked)} />
        <span className="login-options-text">{LOGIN_TEXTS.remember}</span>
      </label>
      <p className="login-options-forgot login-options-text">{LOGIN_TEXTS.forgot}</p>
    </section>
  )
}

export default LoginOptions
