// LoginInput · campo de texto del login (correo o contraseña) con borde izquierdo amarillo
// conecta con: LoginForm (le pasa valor y cambio); props en types/auth.login.types
import React from 'react'
import type { LoginInputProps } from '../../types/auth.login.types'
import './LoginInput.css'

export const LoginInput: React.FC<LoginInputProps> = ({ name, type, value, placeholder, autoComplete, onChange }) => {
  return (
    <input
      className="login-input"
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={onChange}
      aria-label={placeholder}
    />
  )
}

export default LoginInput
