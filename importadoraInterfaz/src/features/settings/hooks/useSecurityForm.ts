// useSecurityForm · formulario de la cuenta del usuario en sesión: nombre, correo y cambio de clave opcional
// conecta con: SecurityTab; despacha saveAccountThunk, valida con settings.helpers y lee la sesión (auth)
// ojo: cambiar la clave exige la contraseña actual y opera sobre PUT /auth/me y PUT /auth/me/password
import { useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { notify } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { validateNewPassword } from '../helpers/settings.helpers'
import { saveAccountThunk } from '../thunks/settings.thunks'

export const useSecurityForm = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (newPassword && !currentPassword.trim()) {
      return notify.error('Debes ingresar tu contraseña actual para cambiarla.')
    }
    const problem = validateNewPassword(newPassword, confirmPassword)
    if (problem) return notify.error(problem)
    setSaving(true)
    const result = await dispatch(saveAccountThunk({ name, email, currentPassword, password: newPassword }))
    setSaving(false)
    if (saveAccountThunk.fulfilled.match(result)) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return {
    user,
    name,
    setName,
    email,
    setEmail,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    saving,
    submit,
  }
}
