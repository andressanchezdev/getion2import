// auth.login.types · props de las partes del formulario de login
// conecta con: LoginInput, LoginOptions y LoginActions (las compone LoginForm)
import type { ChangeEvent } from 'react'

export interface LoginInputProps {
  name: string
  type: string
  value: string
  placeholder: string
  autoComplete?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export interface LoginOptionsProps {
  remember: boolean
  onRememberChange: (value: boolean) => void
}

export interface LoginActionsProps {
  isLoading: boolean
}
