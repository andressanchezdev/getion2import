// customers.adapter.test · pruebas de la conversión de clientes y direcciones de la API y del filtro por texto
// conecta con: customers.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { filterCustomers, toAddressList, toCustomer, toCustomerDetail, toDirections, withNewDirection } from './customers.adapter'
import type { Customer } from '../types/customers.types'

describe('toCustomer', () => {
  it('arma el nombre completo y convierte documento y nivel de precio (p2 es P1)', () => {
    const customer = toCustomer({ id: 7, name: ' Ana ', lastName: ' Pérez ', document: '123', email: 'ana@x.co', personType: 'natural', priceTier: 'p2' })
    expect(customer).toMatchObject({ id: 7, fullName: 'Ana Pérez', identification: '123', email: 'ana@x.co', userType: 'natural', priceType: 'P1', photo: '' })
  })

  it('la razón social sale del nombre comercial', () => {
    expect(toCustomer({ id: 1, tradeName: 'Motos SAS' }).businessName).toBe('Motos SAS')
    expect(toCustomer({ id: 1, tradeName: null }).businessName).toBe('')
  })

  it('sin nombre usa el correo y, si tampoco hay, el número de cliente', () => {
    expect(toCustomer({ id: 3, email: 'sin@nombre.co' }).fullName).toBe('sin@nombre.co')
    expect(toCustomer({ id: 3 }).fullName).toBe('Cliente 3')
  })

  it('un nivel de precio vacío o desconocido queda sin nivel', () => {
    expect(toCustomer({ id: 1, priceTier: '' }).priceType).toBeUndefined()
    expect(toCustomer({ id: 1, priceTier: 'p9' }).priceType).toBeUndefined()
  })
})

describe('toCustomerDetail', () => {
  it('arma los datos de la empresa con los campos planos del cliente', () => {
    const detail = toCustomerDetail({
      id: 7,
      name: 'Motos del Sur SAS',
      documentType: 'NIT',
      document: '900123456',
      tradeName: 'Motos del Sur',
      city: 'Cali',
      address: 'Cra 1 # 2-3',
      phone: '(602) 555-1234',
      mobile: '',
      legalRepresentative: 'Luis Gómez',
    })
    expect(detail.company).toMatchObject({ nit: '900123456', tradeName: 'Motos del Sur', corporateName: 'Motos del Sur SAS', cityAndDepartment: 'Cali', phone: 6025551234, legalRepresentative: 'Luis Gómez' })
    expect(detail.company.cellPhone).toBeUndefined()
  })

  it('un cliente con cédula no tiene NIT y sin datos de empresa no se rompe', () => {
    expect(toCustomerDetail({ id: 1, documentType: 'CC', document: '123' }).company.nit).toBe('')
    expect(toCustomerDetail({ id: 1 }).company.address).toBe('')
  })
})

describe('direcciones del cliente', () => {
  it('toDirections convierte la lista; sin id se usa la posición', () => {
    const list = toDirections({ id: 1, addresses: [{ id: 4, address: ' Calle 1 ', city: 'Cali' }, { address: 'Calle 2' }] })
    expect(list[0]).toMatchObject({ id: 4, address: 'Calle 1', city: 'Cali', neighborhood: '' })
    expect(list[1]).toMatchObject({ id: 2, address: 'Calle 2' })
  })

  it('sin direcciones la lista queda vacía', () => {
    expect(toDirections({ id: 1, addresses: null })).toEqual([])
    expect(toDirections({ id: 1 })).toEqual([])
  })

  it('withNewDirection agrega la dirección con el siguiente id libre', () => {
    const input = { address: 'Calle 9', neighborhood: '', city: 'Cali', department: 'Valle', country: 'Colombia', additionalInfo: '' }
    const current = toDirections({ id: 1, addresses: [{ id: 4, address: 'A' }, { id: 7, address: 'B' }] })
    const next = withNewDirection(current, input)
    expect(next).toHaveLength(3)
    expect(next[2]).toMatchObject({ id: 8, address: 'Calle 9' })
    expect(withNewDirection([], input)[0].id).toBe(1)
  })

  it('toAddressList devuelve las direcciones tal como se guardan en la API', () => {
    const list = toDirections({ id: 1, addresses: [{ id: 4, address: 'A' }] })
    expect(toAddressList(list)[0]).toMatchObject({ id: 4, address: 'A' })
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
