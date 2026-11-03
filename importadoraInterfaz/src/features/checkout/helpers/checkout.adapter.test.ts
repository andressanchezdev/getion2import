// checkout.adapter.test · pruebas del cliente para finalizar compra: direcciones cargadas, descuento general, crédito y validación de la entrega
// conecta con: checkout.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { canPayByCredit, initialDelivery, isDeliveryValid, linesTotal, toCheckoutCustomer, toShippingAddress, totalWithDiscount } from './checkout.adapter'

describe('toCheckoutCustomer', () => {
  it('arma nombre, teléfono (celular primero), descuento y crédito', () => {
    const customer = toCheckoutCustomer({ id: 7, name: ' Taller ', lastName: 'El Pistón', document: '900', phone: '6041234', mobile: '3001234567', discountPercent: 5, creditEnabled: true, creditDays: 30 }, 600000)
    expect(customer).toMatchObject({ id: 7, name: 'Taller El Pistón', phone: '3001234567', discountPercent: 5, creditEnabled: true, availableCredit: 600000, creditDays: 30 })
  })

  it('las direcciones guardadas se cargan con el teléfono; sin ellas se usa la dirección suelta; sin nada queda vacío', () => {
    const saved = toCheckoutCustomer({ id: 1, mobile: '3001112222', addresses: [{ address: 'Cra 5 # 10-20', neighborhood: 'Centro', city: 'Cali', department: 'Valle' }] }, 0)
    expect(saved.deliveries).toEqual([{ address: 'Cra 5 # 10-20, Centro', city: 'Cali, Valle', phone: '3001112222', notes: '' }])
    expect(toCheckoutCustomer({ id: 2, address: 'Calle 1', city: 'Bogotá', phone: '3003334444' }, 0).deliveries[0]).toMatchObject({ address: 'Calle 1', city: 'Bogotá' })
    expect(toCheckoutCustomer({ id: 3 }, 0).deliveries).toEqual([])
  })

  it('el descuento queda entre 0 y 100 y un cliente sin nombre se llama «Cliente N»', () => {
    expect(toCheckoutCustomer({ id: 4, discountPercent: 250 }, 0)).toMatchObject({ discountPercent: 100, name: 'Cliente 4' })
    expect(toCheckoutCustomer({ id: 5, discountPercent: -3 }, 0).discountPercent).toBe(0)
  })
})

describe('entrega, descuento y crédito', () => {
  const customer = toCheckoutCustomer({ id: 1, mobile: '3001112222', discountPercent: 10, creditEnabled: true }, 100000)

  it('la entrega arranca con la primera dirección o, si no hay, con el teléfono del cliente', () => {
    expect(initialDelivery({ ...customer, deliveries: [] })).toEqual({ address: '', city: '', phone: '3001112222', notes: '' })
  })

  it('el descuento general del cliente baja el total (redondeado al peso)', () => {
    expect(linesTotal([{ productId: 1, stockId: 1, name: 'A', quantity: 2, unitPrice: 50000 }])).toBe(100000)
    expect(totalWithDiscount(100000, 10)).toBe(90000)
    expect(totalWithDiscount(99999, 0)).toBe(99999)
  })

  it('el crédito solo se ofrece con crédito habilitado y cupo que alcance', () => {
    expect(canPayByCredit(customer, 90000)).toBe(true)
    expect(canPayByCredit(customer, 100001)).toBe(false)
    expect(canPayByCredit({ ...customer, creditEnabled: false }, 1000)).toBe(false)
  })

  it('la entrega pide dirección, ciudad y teléfono de 10 dígitos', () => {
    expect(isDeliveryValid({ address: 'Cra 5 # 10-20', city: 'Cali', phone: '3001112222', notes: '' })).toBe(true)
    expect(isDeliveryValid({ address: 'Cra 5 # 10-20', city: 'Cali', phone: '300111', notes: '' })).toBe(false)
    expect(isDeliveryValid({ address: '', city: 'Cali', phone: '3001112222', notes: '' })).toBe(false)
  })

  it('la dirección para la API va sin espacios sobrantes', () => {
    expect(toShippingAddress({ address: ' Cra 5 ', city: ' Cali ', phone: '3001112222', notes: ' ' })).toEqual({ address: 'Cra 5', city: 'Cali', phone: '3001112222', notes: '' })
  })
})
