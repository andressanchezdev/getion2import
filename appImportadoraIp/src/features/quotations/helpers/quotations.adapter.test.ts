// quotations.adapter.test · pruebas de la conversión de cotizaciones del backend (forma real de POST /quotations y GET /quotations/stats)
// conecta con: quotations.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toQuotation, toQuotationStats } from './quotations.adapter'

// cotización real de la base de prueba
const DTO = {
  quotationId: 2, userId: 315, sellerId: 315, sellerName: 'Test Updated', quotationNumber: 'QT-1-63054', subtotal: 1000, taxAmount: 190, discountAmount: 0,
  totalAmount: 1190, status: 'draft', validUntil: '2026-01-28T00:00:00Z', createdAt: '2025-12-29T15:44:55Z', itemCount: 0,
}

describe('toQuotation', () => {
  it('arma número, vendedor, estado, vigencia, líneas, total y fecha', () => {
    expect(toQuotation(DTO, '2026-01-01')).toEqual({
      id: 2, number: 'QT-1-63054', customerName: 'Usuario 315', sellerName: 'Test Updated', status: 'draft', validUntil: '2026-01-28', expired: false, lines: 0, totalAmount: 1190, createdAt: '2025-12-29',
    })
  })

  it('un borrador o una enviada con la vigencia pasada se marca vencida', () => {
    expect(toQuotation(DTO, '2026-02-01').expired).toBe(true)
    expect(toQuotation({ ...DTO, status: 'sent' }, '2026-02-01').expired).toBe(true)
  })

  it('el día de la vigencia todavía no está vencida', () => {
    expect(toQuotation(DTO, '2026-01-28').expired).toBe(false)
  })

  it('una cotización aceptada, rechazada o convertida no se marca vencida por fecha', () => {
    for (const status of ['accepted', 'rejected', 'converted']) expect(toQuotation({ ...DTO, status }, '2027-01-01').expired).toBe(false)
  })

  it('sin vigencia (o con la fecha 0001-01-01) no hay vencida', () => {
    expect(toQuotation({ ...DTO, validUntil: undefined }, '2027-01-01')).toMatchObject({ validUntil: '', expired: false })
    expect(toQuotation({ ...DTO, validUntil: '0001-01-01T00:00:00Z' }, '2027-01-01')).toMatchObject({ validUntil: '', expired: false })
  })

  it('el estado se normaliza a minúsculas y los datos que faltan quedan neutros', () => {
    expect(toQuotation({ quotationId: 9, status: 'SENT' }, '2026-01-01')).toMatchObject({ status: 'sent', number: 'Cotización 9', customerName: 'Sin cliente', sellerName: '—', lines: 0, totalAmount: 0 })
  })

  it('usa el nombre del cliente cuando el backend lo manda', () => {
    expect(toQuotation({ ...DTO, userName: 'Taller Norte' }, '2026-01-01').customerName).toBe('Taller Norte')
  })
})

describe('toQuotationStats', () => {
  it('convierte los totales reales', () => {
    expect(toQuotationStats({ totalQuotations: 10, draftCount: 9, sentCount: 1, acceptedCount: 0, rejectedCount: 0, expiredCount: 0, convertedCount: 0, totalValue: 11900, acceptedValue: 0, conversionRate: 0 })).toEqual({
      total: 10, drafts: 9, sent: 1, accepted: 0, rejected: 0, expired: 0, converted: 0, totalValue: 11900, acceptedValue: 0, conversionRate: 0,
    })
  })

  it('un total que falta queda en 0', () => {
    expect(toQuotationStats({}).total).toBe(0)
  })
})
