// useCustomerDocuments · documentos de un cliente: los pide al abrir el cliente y deja renovar uno
// conecta con: CustomerDocumentsSection (lo usa); despacha customers.documents.thunks y lee customers.documents.selectors
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCustomerDocuments } from '../selectors/customers.documents.selectors'
import { loadCustomerDocumentsThunk, renewDocumentThunk } from '../thunks/customers.documents.thunks'

export const useCustomerDocuments = (customerId: number) => {
  const dispatch = useAppDispatch()
  const documents = useAppSelector(selectCustomerDocuments)

  useEffect(() => {
    dispatch(loadCustomerDocumentsThunk(customerId))
  }, [dispatch, customerId])

  // renueva el documento; con archivo lo reemplaza, sin archivo solo reinicia la vigencia
  const renew = useCallback((documentId: number, file?: File) => dispatch(renewDocumentThunk({ customerId, documentId, file })), [dispatch, customerId])

  return { ...documents, renew }
}
