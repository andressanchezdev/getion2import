// customers.adapter.test · pruebas de la conversión de usuarios, direcciones y descuentos del backend y del filtro por texto
// conecta con: customers.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterCustomers, toCustomer, toCustomerDetail, toDirection, toDiscount } from './customers.adapter'
import type { Customer } from '../types/customers.types'

describe('toCustomer', () => {
  it('convierte userId a id y arma el nombre completo', () => {
    const customer = toCustomer({ userId: 7, name: ' Ana ', lastName: ' Pérez ', identification: '123', email: 'ana@x.co', userType: 'CLIENT', priceType: 'P1' })
    expect(customer).toMatchObject({ id: 7, fullName: 'Ana Pérez', identification: '123', email: 'ana@x.co', userType: 'CLIENT', priceType: 'P1' })
  })

  it('la razón social sale de businessName o, si falta, del nombre comercial', () => {
    expect(toCustomer({ userId: 1, companyInformation: { businessName: 'Motos SAS' } }).businessName).toBe('Motos SAS')
    expect(toCustomer({ userId: 1, companyInformation: { tradeName: 'Motos' } }).businessName).toBe('Motos')
    expect(toCustomer({ userId: 1, companyInformation: null }).businessName).toBe('')
  })

  it('sin nombre usa el correo y, si tampoco hay, el número de usuario', () => {
    expect(toCustomer({ userId: 3, email: 'sin@nombre.co' }).fullName).toBe('sin@nombre.co')
    expect(toCustomer({ userId: 3 }).fullName).toBe('Usuario 3')
  })

  it('un nivel de precio vacío queda sin nivel', () => {
    expect(toCustomer({ userId: 1, priceType: '' }).priceType).toBeUndefined()
  })
})

describe('toCustomerDetail', () => {
  it('agrega la comisión y los datos de la empresa', () => {
    const detail = toCustomerDetail({
      userId: 7,
      name: 'Ana',
      comissionRate: 5,
      companyInformation: { nit: '900', cityAndDepartment: 'Cali, Valle', phone: 555, cellPhone: 0 },
    })
    expect(detail.commissionRate).toBe(5)
    expect(detail.company).toMatchObject({ nit: '900', cityAndDepartment: 'Cali, Valle', phone: 555 })
    expect(detail.company.cellPhone).toBeUndefined()
  })

  it('sin información de empresa no se rompe', () => {
    expect(toCustomerDetail({ userId: 1 }).company.nit).toBe('')
  })
})

describe('toDirection y toDiscount', () => {
  it('toDirection convierte directionId a id y limpia espacios', () => {
    expect(toDirection({ directionId: 4, address: ' Calle 1 ', city: 'Cali' })).toMatchObject({ id: 4, address: 'Calle 1', city: 'Cali', neighborhood: '' })
  })

  it('toDiscount convierte discountId a id y deja sin definir los ids en 0', () => {
    const discount = toDiscount({ discountId: 9, brandId: 2, categoryId: 0, productId: 0, rate: 10, quantity: 5 })
    expect(discount).toMatchObject({ id: 9, brandId: 2, rate: 10, quantity: 5, isActive: true })
    expect(discount.categoryId).toBeUndefined()
    expect(discount.productId).toBeUndefined()
  })

  it('un descuento marcado inactivo se conserva como inactivo', () => {
    expect(toDiscount({ discountId: 1, isActive: false }).isActive).toBe(false)
  })
})

describe('filterCustomers', () => {
  const base = { photo: '', userType: '', priceType: undefined }
  const list: Customer[] = [
    { ...base, id: 1, name: 'Ana', lastName: 'Pérez', fullName: 'Ana Pérez', identification: '111', email: 'ana@x.co', businessName: 'Motos SAS' },
    { ...base, id: 2, name: 'Luis', lastName: 'Gómez', fullName: 'Luis Gómez', identification: '222', email: 'luis@y.co', businessName: '' },
  ]

  it('sin texto devuelve todos', () => {
    expect(filterCustomers(list, '  ')).toHaveLength(2)
  })

  it('busca por nombre, documento, correo o razón social, sin importar mayúsculas', () => {
    expect(filterCustomers(list, 'GÓMEZ').map((c) => c.id)).toEqual([2])
    expect(filterCustomers(list, '111').map((c) => c.id)).toEqual([1])
    expect(filterCustomers(list, 'y.co').map((c) => c.id)).toEqual([2])
    expect(filterCustomers(list, 'motos').map((c) => c.id)).toEqual([1])
  })

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filterCustomers(list, 'zzz')).toEqual([])
  })
})
