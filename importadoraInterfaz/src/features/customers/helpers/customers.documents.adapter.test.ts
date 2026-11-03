import { describe, expect, it } from 'vitest'
import { documentTypeLabel, expiryLabel, toCustomerDocument, toDocumentAlert, worstStatusByCustomer } from './customers.documents.adapter'
import type { CustomerDocumentAlert } from '../types/customers.types'

const alert = (customerId: number, status: CustomerDocumentAlert['status']): CustomerDocumentAlert => ({
  documentId: customerId * 10,
  customerId,
  customerName: 'Cliente',
  customerDocument: '900',
  type: 'rut',
  fileName: 'rut.pdf',
  expiresAt: '2026-12-01T00:00:00Z',
  status,
  daysLeft: 3,
})

describe('customers.documents.adapter', () => {
  it('convierte un documento de la API y trata un estado desconocido como vigente', () => {
    const doc = toCustomerDocument({ id: 1, customerId: 2, docType: 'rut', fileName: 'a.pdf', fileUrl: '/uploads/a.pdf', uploadedAt: '2026-01-01', expiresAt: '2027-01-01', status: 'raro', daysLeft: 90 })
    expect(doc).toMatchObject({ id: 1, customerId: 2, type: 'rut', notes: '', status: 'valid', daysLeft: 90 })
  })

  it('convierte una alerta de la API', () => {
    const converted = toDocumentAlert({ documentId: 5, customerId: 7, customerName: 'Moto SAS', customerDocument: '900', docType: 'chamber', fileName: 'c.pdf', expiresAt: '2026-11-10', status: 'expired', daysLeft: -4 })
    expect(converted).toMatchObject({ documentId: 5, customerId: 7, type: 'chamber', status: 'expired', daysLeft: -4 })
  })

  it('nombra los tipos de documento y usa «Otro documento» para los desconocidos', () => {
    expect(documentTypeLabel('id_card')).toBe('Cédula')
    expect(documentTypeLabel('xyz')).toBe('Otro documento')
  })

  it('el estado vencido pesa más que por vencer en cada cliente', () => {
    const result = worstStatusByCustomer([alert(1, 'expired'), alert(1, 'expiring'), alert(2, 'expiring'), alert(3, 'expiring'), alert(3, 'expired')])
    expect(result).toEqual({ 1: 'expired', 2: 'expiring', 3: 'expired' })
  })

  it('escribe la vigencia en español', () => {
    expect(expiryLabel('expired', -3)).toBe('Vencido hace 3 días')
    expect(expiryLabel('expired', -1)).toBe('Vencido hace 1 día')
    expect(expiryLabel('expiring', 0)).toBe('Vence hoy')
    expect(expiryLabel('expiring', 12)).toBe('Vence en 12 días')
    expect(expiryLabel('valid', 200)).toBe('Vigente')
  })
})
