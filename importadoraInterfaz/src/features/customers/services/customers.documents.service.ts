// customers.documents.service · llamadas al backend de los documentos del cliente: listar, renovar y alertas de vencimiento
// conecta con: api/client y api/config (rutas), customers.documents.adapter (convierte); las usa customers.documents.thunks
// ojo: el vencimiento lo calcula la API (fecha de subida + meses de vigencia del cliente); renovar reinicia esa vigencia y puede reemplazar el archivo
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toCustomerDocument, toDocumentAlert } from '../helpers/customers.documents.adapter'
import type { CustomerDocumentAlertDto, CustomerDocumentDto } from '../types/customers.api.types'
import type { CustomerDocument, CustomerDocumentAlert } from '../types/customers.types'

const { CUSTOMERS } = API_CONFIG.ENDPOINTS

// trae los documentos de un cliente con su vencimiento y estado
export const fetchCustomerDocuments = async (customerId: number): Promise<CustomerDocument[]> => {
  const { data } = await apiClient.get<APIResponse<CustomerDocumentDto[] | null>>(CUSTOMERS.DOCUMENTS(customerId))
  return (data.data ?? []).map(toCustomerDocument)
}

// trae los documentos vencidos o por vencer de los clientes activos de la compañía
export const fetchDocumentAlerts = async (): Promise<CustomerDocumentAlert[]> => {
  const { data } = await apiClient.get<APIResponse<CustomerDocumentAlertDto[] | null>>(CUSTOMERS.DOCUMENT_ALERTS)
  return (data.data ?? []).map(toDocumentAlert)
}

// renueva un documento: sin archivo solo reinicia la vigencia; con archivo además reemplaza el anterior
export const renewCustomerDocument = async (customerId: number, documentId: number, file?: File): Promise<void> => {
  const body = new FormData()
  if (file) body.append('file', file)
  await apiClient.post(CUSTOMERS.DOCUMENT_RENEW(customerId, documentId), body)
}
