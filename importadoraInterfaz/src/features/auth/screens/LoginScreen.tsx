// LoginScreen · pantalla completa de login: fondo, ilustración a la izquierda y panel blanco con el formulario
// conecta con: LoginHero y LoginForm; la muestra AuthGate cuando no hay sesión
import React from 'react'
import { LoginHero } from '../components/branding/LoginHero'
import { LoginForm } from '../components/form/LoginForm'
import './LoginScreen.css'

export const LoginScreen: React.FC = () => {
  return (
    <div className="login-screen">
      <section className="login-screen-section">
        <LoginHero />
        <div className="login-screen-panel">
          <LoginForm />
        </div>
      </section>
    </div>
  )
}

export default LoginScreen
