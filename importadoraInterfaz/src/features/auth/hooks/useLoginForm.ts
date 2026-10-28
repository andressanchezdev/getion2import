// useLoginForm · estado y envío del formulario de login (correo, contraseña, recordarme) con alertas flotantes
// conecta con: auth.helpers (validación), auth.thunks (login), auth.selectors (¿ingresando?), global toast; lo usa LoginForm
// ojo: igual que importadora-online, pero sin mostrar tokens en consola y con alertas de sonner en vez de texto en rojo
import { useState, type FormEvent } from 'react'
import { toast } from '@/global/helpers/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { LOGIN_MESSAGES } from '../constants/auth.constants'
import { getDisplayName, hasLoginFields } from '../helpers/auth.helpers'
import { selectIsAuthenticating } from '../selectors/auth.selectors'
import { loginThunk } from '../thunks/auth.thunks'

export const useLoginForm = () => {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectIsAuthenticating)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!hasLoginFields(email, password)) {
      toast.error(LOGIN_MESSAGES.incompleteTitle, { description: LOGIN_MESSAGES.incompleteDescription })
      return
    }

    const result = await dispatch(loginThunk({ email: email.trim(), password, remember }))
    if (loginThunk.fulfilled.match(result)) {
      toast.success(LOGIN_MESSAGES.successTitle, { description: `Hola, ${getDisplayName(result.payload)}` })
    } else {
      toast.error(LOGIN_MESSAGES.failedTitle, { description: result.payload ?? LOGIN_MESSAGES.unknownError })
    }
  }

  return { email, setEmail, password, setPassword, remember, setRemember, isLoading, handleSubmit }
}
