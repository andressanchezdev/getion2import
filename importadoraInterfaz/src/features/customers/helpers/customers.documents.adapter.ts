// customers.documents.adapter · convierte los documentos del cliente de la API y cuenta los vencidos y por vencer por cliente
// conecta con: customers.documents.service (lo aplica a cada respuesta), customers.documents.selectors y los componentes de documentos
import type { CustomerDocumentAlertDto, CustomerDocumentDto } from '../types/customers.api.types'
import type { CustomerDocument, CustomerDocumentAlert, DocumentStatus } from '../types/customers.types'

// nombre en español de cada tipo de documento
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  rut: 'RUT',
  id_card: 'Cédula',
  chamber: 'Cámara de comercio',
  credit_form: 'Formulario de crédito',
  other: 'Otro documento',
}

// cualquier estado desconocido se trata como vigente
const toStatus = (value: string): DocumentStatus => (value === 'expired' || value === 'expiring' ? value : 'valid')

// el nombre legible del tipo de documento
export const documentTypeLabel = (type: string): string => DOCUMENT_TYPE_LABELS[type] ?? DOCUMENT_TYPE_LABELS.other

// pasa un documento de la API a lo que usa la app
export const toCustomerDocument = (dto: CustomerDocumentDto): CustomerDocument => ({
  id: dto.id,
  customerId: dto.customerId,
  type: dto.docType,
  fileName: dto.fileName,
  fileUrl: dto.fileUrl,
  notes: dto.notes ?? '',
  uploadedAt: dto.uploadedAt,
  expiresAt: dto.expiresAt,
  status: toStatus(dto.status),
  daysLeft: dto.daysLeft,
})

// pasa una alerta de documento de la API a lo que usa la app
export const toDocumentAlert = (dto: CustomerDocumentAlertDto): CustomerDocumentAlert => ({
  documentId: dto.documentId,
  customerId: dto.customerId,
  customerName: dto.customerName,
  customerDocument: dto.customerDocument,
  type: dto.docType,
  fileName: dto.fileName,
  expiresAt: dto.expiresAt,
  status: toStatus(dto.status),
  daysLeft: dto.daysLeft,
})

// el peor estado de documentos de cada cliente (vencido pesa más que por vencer); los clientes sin alertas no aparecen
export const worstStatusByCustomer = (alerts: CustomerDocumentAlert[]): Record<number, DocumentStatus> => {
  const result: Record<number, DocumentStatus> = {}
  for (const alert of alerts) {
    if (result[alert.customerId] !== 'expired') result[alert.customerId] = alert.status
  }
  return result
}

// texto corto de la vigencia: «Vencido hace 3 días», «Vence hoy», «Vence en 12 días» o «Vigente»
export const expiryLabel = (status: DocumentStatus, daysLeft: number): string => {
  const days = Math.abs(daysLeft)
  const unit = days === 1 ? 'día' : 'días'
  if (status === 'expired') return days === 0 ? 'Venció hoy' : `Vencido hace ${days} ${unit}`
  if (status === 'expiring') return daysLeft <= 0 ? 'Vence hoy' : `Vence en ${days} ${unit}`
  return 'Vigente'
}
