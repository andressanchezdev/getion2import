// checkout.blockers.test · motivos de bloqueo del checkout y normalización del teléfono
import { describe, expect, it } from 'vitest'
import { checkoutBlockers, normalizePhone, type BlockerInput } from './checkout.blockers'

const ok: BlockerInput = {
  hasCustomer: true,
  linesCount: 2,
  delivery: { address: 'Cra 5 # 10-20', city: 'Cali', phone: '3101234567', notes: '' },
  deliveryRequired: true,
  needsEmployee: false,
  employeeId: 0,
  onPayment: false,
  transferMissingProof: false,
}

describe('normalizePhone', () => {
  it('quita espacios, guiones y paréntesis', () => expect(normalizePhone('(310) 123-4567')).toBe('3101234567'))
  it('quita el prefijo 57 de un celular colombiano', () => expect(normalizePhone('+57 310 123 4567')).toBe('3101234567'))
  it('no recorta un número de 10 dígitos que empieza por 57', () => expect(normalizePhone('5712345678')).toBe('5712345678'))
})

describe('checkoutBlockers', () => {
  it('sin pendientes devuelve lista vacía', () => expect(checkoutBlockers(ok)).toEqual([]))
  it('pide el cliente', () => expect(checkoutBlockers({ ...ok, hasCustomer: false })).toEqual(['Elige el cliente.']))
  it('avisa si los productos cargan o no hay', () => {
    expect(checkoutBlockers({ ...ok, linesCount: null })).toContain('Preparando los productos…')
    expect(checkoutBlockers({ ...ok, linesCount: 0 })).toContain('No hay productos en el pedido.')
  })
  it('nombra cada dato de entrega que falta', () => {
    const msgs = checkoutBlockers({ ...ok, delivery: { address: 'ab', city: '', phone: '123', notes: '' } })
    expect(msgs).toHaveLength(3)
    expect(msgs.join(' ')).toMatch(/dirección.*ciudad.*teléfono/)
  })
  it('acepta el teléfono con prefijo y espacios', () => {
    expect(checkoutBlockers({ ...ok, delivery: { ...ok.delivery, phone: '+57 310 123 4567' } })).toEqual([])
  })
  it('una cotización no pide entrega', () => {
    expect(checkoutBlockers({ ...ok, deliveryRequired: false, delivery: { address: '', city: '', phone: '', notes: '' } })).toEqual([])
  })
  it('el administrador debe elegir empleado', () => {
    expect(checkoutBlockers({ ...ok, needsEmployee: true })).toEqual(['Elige el empleado al que se asigna la venta.'])
  })
  it('la transferencia pide comprobante solo en el paso de pago', () => {
    expect(checkoutBlockers({ ...ok, transferMissingProof: true })).toEqual([])
    expect(checkoutBlockers({ ...ok, onPayment: true, transferMissingProof: true })).toEqual(['Adjunta el comprobante de la transferencia.'])
  })
})
