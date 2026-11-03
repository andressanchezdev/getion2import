// quotations.adapter.test · pruebas de la conversión de cotizaciones, el filtro por texto y fechas y el enlace de WhatsApp
// conecta con: quotations.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterQuotations, pickWhatsapp, toQuotation, toWhatsappNumber, toWhatsappUrl } from './quotations.adapter'
import type { Quotation } from '../types/quotations.types'

const quotation = (over: Partial<Quotation> = {}): Quotation => ({
  id: 1, serialCode: 'COT-1', customerId: 7, customerName: 'Taller El Pistón', whatsapp: '3001234567', employeeName: 'Ana', status: 'draft',
  total: 150000, notes: '', createdAt: '2026-10-20T15:00:00', items: [{ id: 1, productId: 5, code: 'A1', name: 'ANILLOS PULSAR 135', quantity: 2, unitPrice: 75000, lineTotal: 150000 }], ...over,
})

describe('toQuotation', () => {
  it('une el WhatsApp del cliente, usa un código por defecto y limpia los textos', () => {
    const result = toQuotation({ id: 9, customerId: 7, customerName: ' Taller ', employeeName: ' Ana ', status: 'sent', total: 10, createdAt: '2026-10-20T10:00:00Z' }, new Map([[7, '3001234567']]))
    expect(result).toMatchObject({ id: 9, serialCode: 'COT-9', customerName: 'Taller', employeeName: 'Ana', whatsapp: '3001234567', status: 'sent', items: [] })
  })

  it('sin teléfono del cliente el WhatsApp queda vacío y un estado raro es borrador', () => {
    expect(toQuotation({ id: 1, customerId: 99, status: 'otro', total: 1, createdAt: '' }, new Map())).toMatchObject({ whatsapp: '', status: 'draft' })
  })
})

describe('WhatsApp', () => {
  it('toma el celular y, si no hay, el teléfono, solo con dígitos', () => {
    expect(pickWhatsapp('300 123 4567', '6041234')).toBe('3001234567')
    expect(pickWhatsapp(null, '604-1234')).toBe('6041234')
    expect(pickWhatsapp(undefined, undefined)).toBe('')
  })

  it('agrega el 57 a un número de 10 dígitos y deja igual el que ya trae indicativo', () => {
    expect(toWhatsappNumber('3001234567')).toBe('573001234567')
    expect(toWhatsappNumber('573001234567')).toBe('573001234567')
  })

  it('el enlace lleva el número y el mensaje con la cotización; sin número no hay enlace', () => {
    const url = toWhatsappUrl(quotation()) ?? ''
    expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true)
    const text = decodeURIComponent(url.split('text=')[1])
    expect(text).toContain('COT-1')
    expect(text).toContain('ANILLOS PULSAR 135 x2')
    expect(toWhatsappUrl(quotation({ whatsapp: '' }))).toBeNull()
  })
})

describe('filterQuotations', () => {
  const list = [
    quotation({ id: 1, serialCode: 'COT-1', createdAt: '2026-10-10T09:00:00' }),
    quotation({ id: 2, serialCode: 'COT-2', customerName: 'Motos Ávila', whatsapp: '3109998888', employeeName: 'Luis', createdAt: '2026-10-20T09:00:00' }),
    quotation({ id: 3, serialCode: 'COT-3', createdAt: '2026-10-30T09:00:00' }),
  ]

  it('busca por código, cliente, WhatsApp o quién la hizo', () => {
    expect(filterQuotations(list, { search: 'cot-3', from: '', to: '' }).map((q) => q.id)).toEqual([3])
    expect(filterQuotations(list, { search: 'ávila', from: '', to: '' }).map((q) => q.id)).toEqual([2])
    expect(filterQuotations(list, { search: '310999', from: '', to: '' }).map((q) => q.id)).toEqual([2])
    expect(filterQuotations(list, { search: 'luis', from: '', to: '' }).map((q) => q.id)).toEqual([2])
  })

  it('el rango de un día A a un día B incluye los dos extremos', () => {
    expect(filterQuotations(list, { search: '', from: '2026-10-10', to: '2026-10-20' }).map((q) => q.id)).toEqual([1, 2])
    expect(filterQuotations(list, { search: '', from: '2026-10-21', to: '' }).map((q) => q.id)).toEqual([3])
    expect(filterQuotations(list, { search: '', from: '', to: '2026-10-09' })).toEqual([])
  })

  it('sin filtros devuelve todo', () => {
    expect(filterQuotations(list, { search: '', from: '', to: '' })).toHaveLength(3)
  })
})
