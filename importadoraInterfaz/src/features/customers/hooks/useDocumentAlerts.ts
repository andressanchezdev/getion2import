// useDocumentAlerts · pide las alertas de documentos vencidos o por vencer y devuelve el peor estado por cliente
// conecta con: CustomersTable (lo usa para marcar las filas); despacha customers.documents.thunks y lee customers.documents.selectors y la sesión de auth
// ojo: solo corre con sesión (companyId); una sola carga al montar la tabla
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectDocumentStatusByCustomer } from '../selectors/customers.documents.selectors'
import { loadDocumentAlertsThunk } from '../thunks/customers.documents.thunks'

export const useDocumentAlerts = () => {
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(selectCurrentUser)?.companyId
  const statusByCustomer = useAppSelector(selectDocumentStatusByCustomer)

  useEffect(() => {
    if (companyId) dispatch(loadDocumentAlertsThunk())
  }, [dispatch, companyId])

  return statusByCustomer
}
