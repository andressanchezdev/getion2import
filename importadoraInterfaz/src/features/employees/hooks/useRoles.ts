// useRoles · pide los roles de la compañía (también los inactivos) al backend y devuelve la lista, si está cargando y el error
// conecta con: RolesView (lo usa), employees.thunks (loadRolesThunk) y employees.selectors
// ojo: solo pide cuando el estado está «idle»; crear o editar un rol (saveRoleThunk) ya vuelve a pedir la lista
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectRoles } from '../selectors/employees.selectors'
import { loadRolesThunk } from '../thunks/employees.thunks'

export const useRoles = () => {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector(selectRoles)

  useEffect(() => {
    if (status === 'idle') dispatch(loadRolesThunk())
  }, [dispatch, status])

  return { roles: items, loading: status === 'idle' || status === 'loading', error }
}
