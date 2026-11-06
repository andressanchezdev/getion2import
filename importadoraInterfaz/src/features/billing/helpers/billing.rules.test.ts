// billing.rules.test · pruebas de las reglas de facturación y del adaptador de la API
// conecta con: billing.rules y billing.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterInvoices, toBillingConfig, toDocSeries, toInvoice } from './billing.adapter'
import { billingProblem, colombianNITProblem, nextNumberLabel, rangeRemaining, seriesProblem } from './billing.rules'

describe('series y rango', () => {
  it('arma el próximo número con prefijo y 6 dígitos', () => {
    expect(nextNumberLabel('FE-', 2)).toBe('FE-000002')
    expect(nextNumberLabel('PED-', 1234)).toBe('PED-001234')
  })

  it('una serie necesita prefijo y un entero desde 1', () => {
    expect(seriesProblem('', 1)).toMatch(/prefijo/)
    expect(seriesProblem('FE-', 0)).toMatch(/entero/)
    expect(seriesProblem('FE-', 1.5)).toMatch(/entero/)
    expect(seriesProblem('FE-', 10)).toBeNull()
  })

  it('cuántos números del rango quedan', () => {
    expect(rangeRemaining({ rangeFrom: 1, rangeTo: 5000 }, 101)).toBe(4900)
    expect(rangeRemaining({ rangeFrom: 1, rangeTo: 100 }, 150)).toBe(0)
    expect(rangeRemaining({ rangeFrom: 100, rangeTo: 200 }, 1)).toBe(101)
    expect(rangeRemaining({ rangeFrom: null, rangeTo: null }, 5)).toBeNull()
  })

  it('los datos fiscales piden NIT, razón social y un rango en orden', () => {
    expect(billingProblem({ nit: '', legalName: 'X' })).toMatch(/NIT/)
    expect(billingProblem({ nit: '900373913-4', legalName: ' ' })).toMatch(/razón social/)
    expect(billingProblem({ nit: '900373913-4', legalName: 'X', rangeFrom: 10, rangeTo: 5 })).toMatch(/rango/)
    expect(billingProblem({ nit: '900373913-4', legalName: 'X', rangeFrom: 1, rangeTo: 5 })).toBeNull()
  })

  it('valida formato y dígito de verificación del NIT colombiano', () => {
    expect(colombianNITProblem('900.373.913-4')).toBeNull()
    expect(colombianNITProblem('900373913-5')).toMatch(/verificación/)
    expect(colombianNITProblem('123', 'CC')).toBeNull()
  })
})

describe('adaptador', () => {
  it('convierte la factura y deja neutro lo que falta', () => {
    expect(toInvoice({ id: 1, number: ' FE-000001 ', kind: 'invoice', status: 'issued', saleId: 4, issuedAt: '2026-11-01T10:00:00Z' })).toMatchObject({ number: 'FE-000001', saleSerial: 'Venta 4', employeeName: '—', issuedAt: '2026-11-01', pdfUrl: '' })
    expect(toInvoice({ id: 2, number: 'NC-1', kind: 'credit_note', status: 'raro', saleId: 4 })).toMatchObject({ kind: 'credit_note', status: 'issued' })
  })

  it('convierte los datos fiscales con valores por defecto', () => {
    const config = toBillingConfig({ id: 1, warehouseId: 2, typeFacturation: 'x', documentType: 'CC', nit: '900', legalName: 'Premium', rangeFrom: 1, rangeTo: 99 })
    expect(config).toMatchObject({ typeFacturation: 'juridica', documentType: 'CC', rangeTo: 99, resolutionDate: '', isActive: true, vatWithholder: false })
  })

  it('convierte una serie', () => {
    expect(toDocSeries({ id: 3, warehouseId: 1, docType: 'invoice', prefix: ' FE-', nextNumber: 2 })).toEqual({ id: 3, warehouseId: 1, docType: 'invoice', prefix: 'FE-', nextNumber: 2 })
  })

  it('filtra facturas por texto y estado', () => {
    const a = toInvoice({ id: 1, number: 'FE-000001', kind: 'invoice', status: 'issued', saleId: 4, saleSerial: 'PED-0004' })
    const b = toInvoice({ id: 2, number: 'FE-000002', kind: 'invoice', status: 'annulled', saleId: 5, saleSerial: 'PED-0005' })
    expect(filterInvoices([a, b], 'ped-0005', 'all').map((i) => i.id)).toEqual([2])
    expect(filterInvoices([a, b], '', 'issued').map((i) => i.id)).toEqual([1])
  })
})
