// quotations.draft.test · opciones de cliente y producto, renglones y total del formulario de cotización
import { describe, expect, it } from 'vitest'
import type { Product } from '@/features/shop'
import { addProductToDraft, draftTotal, patchDraftItem, toCustomerOption, toProductOption } from './quotations.draft'

const option = { id: 1, code: 'A-1', name: 'Bujía', price: 1000 }

describe('toCustomerOption', () => {
  it('usa la razón social si existe', () => expect(toCustomerOption({ id: 2, businessName: 'Motos SAS', name: 'Ana' }).name).toBe('Motos SAS'))
  it('junta nombre y apellido', () => expect(toCustomerOption({ id: 2, name: 'Ana', lastName: 'Pérez' }).name).toBe('Ana Pérez'))
  it('prefiere el celular al teléfono', () => expect(toCustomerOption({ id: 2, name: 'A', phone: '1', mobile: '2' }).phone).toBe('2'))
  it('pone un nombre si no hay ninguno', () => expect(toCustomerOption({ id: 2 }).name).toBe('Cliente sin nombre'))
})

describe('toProductOption', () => {
  it('toma el precio de mostrador P0', () => {
    const product = { id: '7', code: 'B-2', name: 'Filtro', prices: { p0: 500, p1: 400, p2: 300, p3: 200 } } as unknown as Product
    expect(toProductOption(product)).toEqual({ id: 7, code: 'B-2', name: 'Filtro', price: 500 })
  })
})

describe('renglones', () => {
  it('agrega un producto nuevo con cantidad 1', () => expect(addProductToDraft([], option)[0]).toMatchObject({ productId: 1, quantity: 1, unitPrice: 1000 }))
  it('suma una unidad si ya estaba', () => expect(addProductToDraft(addProductToDraft([], option), option)[0].quantity).toBe(2))
  it('no deja cantidad menor a 1 ni precio negativo', () => {
    const items = addProductToDraft([], option)
    expect(patchDraftItem(items, 1, { quantity: 0 })[0].quantity).toBe(1)
    expect(patchDraftItem(items, 1, { unitPrice: -5 })[0].unitPrice).toBe(0)
  })
  it('suma el total', () => expect(draftTotal(patchDraftItem(addProductToDraft([], option), 1, { quantity: 3 }))).toBe(3000))
})
