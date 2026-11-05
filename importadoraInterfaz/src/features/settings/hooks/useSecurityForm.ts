// useSecurityForm · formulario de la cuenta del usuario en sesión: nombre, correo y cambio de clave opcional
// conecta con: SecurityTab; despacha saveAccountThunk, valida con settings.helpers y lee la sesión (auth)
// ojo: el backend no pide la clave actual para cambiarla (lo autoriza el permiso employees:edit), por eso el formulario no la pide
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
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const problem = validateNewPassword(newPassword, confirmPassword)
    if (problem) return notify.error(problem)
    setSaving(true)
    const result = await dispatch(saveAccountThunk({ name, email, password: newPassword }))
    setSaving(false)
    if (saveAccountThunk.fulfilled.match(result)) {
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return { user, name, setName, email, setEmail, newPassword, setNewPassword, confirmPassword, setConfirmPassword, saving, submit }
}
