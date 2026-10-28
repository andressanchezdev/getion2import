// LoginWelcome · título "Bienvenido" y frase de bienvenida del login
// conecta con: LoginForm (va entre la marca y los campos); los textos salen de auth.constants
import React from 'react'
import { LOGIN_TEXTS } from '../../constants/auth.constants'
import './LoginWelcome.css'

export const LoginWelcome: React.FC = () => {
  return (
    <div className="login-welcome">
      <h2 className="login-welcome-title">{LOGIN_TEXTS.welcome}</h2>
      <p className="login-welcome-text">{LOGIN_TEXTS.subtitle}</p>
    </div>
  )
}

export default LoginWelcome
