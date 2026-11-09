// LoginForm · formulario del login: marca, saludo, campos, opciones y botones
// conecta con: useLoginForm (estado y envío) y las partes LoginBrand, LoginWelcome, LoginInput, LoginOptions y LoginActions
import React, { useState } from 'react'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import eyeOffIcon from '@/assets/icons/eye-off.svg?raw'
import { LOGIN_TEXTS } from '../../constants/auth.constants'
import { useLoginForm } from '../../hooks/useLoginForm'
import { LoginBrand } from '../branding/LoginBrand'
import { LoginWelcome } from '../branding/LoginWelcome'
import { LoginInput } from './LoginInput'
import { LoginOptions } from './LoginOptions'
import { LoginActions } from './LoginActions'
import './LoginForm.css'

export const LoginForm: React.FC = () => {
  const { email, setEmail, password, setPassword, remember, setRemember, isLoading, handleSubmit } = useLoginForm()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <LoginBrand />
      <LoginWelcome />

      <div className="login-form-fields">
        <LoginInput
          name="email"
          type="email"
          value={email}
          placeholder={LOGIN_TEXTS.emailPlaceholder}
          autoComplete="username"
          onChange={(e) => setEmail(e.target.value)}
        />
        <LoginInput
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          placeholder={LOGIN_TEXTS.passwordPlaceholder}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          endAction={
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              <span
                className="login-password-toggle-icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: showPassword ? eyeOffIcon : eyeIcon }}
              />
            </button>
          }
        />
      </div>

      <LoginOptions remember={remember} onRememberChange={setRemember} />
      <LoginActions isLoading={isLoading} />
    </form>
  )
}

export default LoginForm
