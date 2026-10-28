// useCustomersLoader · pide la lista de clientes al backend la primera vez y cada vez que cambia la página
// conecta con: CustomersScreen (lo usa al montarse); despacha customers.thunks y lee customers.selectors y la sesión de auth
// ojo: solo corre con sesión (companyId); la búsqueda por texto NO dispara una carga (se filtra en pantalla)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectCustomersPage } from '../selectors/customers.selectors'
import { loadCustomersThunk } from '../thunks/customers.thunks'

export const useCustomersLoader = (): void => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const companyId = user?.companyId
  const page = useAppSelector(selectCustomersPage)

  useEffect(() => {
    if (companyId) dispatch(loadCustomersThunk())
  }, [dispatch, companyId, page])
}
