// LoginHero · ilustración grande del lado izquierdo del login
// conecta con: LoginScreen (la coloca sobre el fondo); la imagen es assets/images/login-ilustracion.svg
// ojo: el original pesaba 23.5 MB; esta versión (PNG embebidos pasados a WebP) pesa menos de 1 MB y se ve igual
import React from 'react'
import illustration from '@/assets/images/login-ilustracion.svg'
import './LoginHero.css'

export const LoginHero: React.FC = () => {
  return <img className="login-hero" src={illustration} alt="IP Online" />
}

export default LoginHero
