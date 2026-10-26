// LoginBrand · marca del login: logo "IP" sobre cuadro oscuro y la palabra "Online"
// conecta con: LoginForm (va arriba del formulario); el texto sale de auth.constants
import React from 'react'
import { LOGIN_TEXTS } from '../../constants/auth.constants'
import './LoginBrand.css'

export const LoginBrand: React.FC = () => {
  return (
    <div className="login-brand">
      <div className="login-brand-logo">
        <svg width="32" height="31" viewBox="0 0 32 31" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M5.5653 0C2.49151 0 0 2.49151 0 5.5653C0 8.63908 2.49151 11.1306 5.5653 11.1306C8.63908 11.1306 11.1306 8.63908 11.1306 5.5653C11.1297 2.49151 8.6382 0 5.5653 0Z"
            fill="white"
          />
          <path
            d="M9.73798 26.4355V13.9141H5.56445V22.2611C5.56445 24.5671 7.43287 26.4355 9.73798 26.4355Z"
            fill="white"
          />
          <path
            d="M21.5647 5.56641C15.8023 5.56641 11.1309 10.2379 11.1309 16.0002V30.6085H15.3044V16.0011H15.3017C15.3026 12.543 18.1057 9.74082 21.5638 9.74082C25.0219 9.74082 27.8259 12.5448 27.8259 16.0029C27.8259 19.461 25.0219 22.265 21.5638 22.265H16.6962V26.4358H21.5656C27.3279 26.4358 32.0003 21.7644 32.0003 16.0011C31.9985 10.2379 27.327 5.56641 21.5647 5.56641Z"
            fill="white"
          />
        </svg>
      </div>
      <h2 className="login-brand-name">{LOGIN_TEXTS.brand}</h2>
    </div>
  )
}

export default LoginBrand
