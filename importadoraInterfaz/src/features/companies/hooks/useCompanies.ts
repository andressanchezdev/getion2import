// useCompanies · pide las compañías al backend una vez (si está activado) y devuelve la lista, el estado de carga y el error
// conecta con: CompanySelector y CompaniesScreen (lo usan), companies.thunks (loadCompaniesThunk) y companies.selectors
// ojo: solo pide cuando el estado está «idle»; si falla no reintenta solo (se evita un bucle con el servidor caído)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCompanies } from '../selectors/companies.selectors'
import { loadCompaniesThunk } from '../thunks/companies.thunks'

export const useCompanies = (enabled: boolean) => {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector(selectCompanies)

  useEffect(() => {
    if (enabled && status === 'idle') dispatch(loadCompaniesThunk())
  }, [dispatch, enabled, status])

  return { companies: items, status, error }
}
