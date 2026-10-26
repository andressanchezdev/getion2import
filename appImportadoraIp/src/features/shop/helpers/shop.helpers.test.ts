// shop.helpers.test · pruebas de clampQuantity (la cantidad siempre queda entre 1 y el stock)
// conecta con: shop.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import { clampQuantity, createCartUuid, toWarehouseNumber } from './shop.helpers'

describe('clampQuantity', () => {
  it('deja pasar una cantidad válida', () => {
    expect(clampQuantity(5, 10)).toBe(5)
  })

  it('sube a 1 si es menor que 1', () => {
    expect(clampQuantity(0, 10)).toBe(1)
    expect(clampQuantity(-3, 10)).toBe(1)
  })

  it('baja al stock si lo supera', () => {
    expect(clampQuantity(999, 42)).toBe(42)
  })

  it('redondea hacia abajo los decimales', () => {
    expect(clampQuantity(2.9, 10)).toBe(2)
  })

  it('con un valor que no es número queda en 1', () => {
    expect(clampQuantity(Number.NaN, 10)).toBe(1)
    expect(clampQuantity(Number.POSITIVE_INFINITY, 10)).toBe(1)
  })

  it('sin stock devuelve 0', () => {
    expect(clampQuantity(3, 0)).toBe(0)
    expect(clampQuantity(3, -1)).toBe(0)
  })
})

describe('toWarehouseNumber', () => {
  it('convierte el id de bodega a número', () => {
    expect(toWarehouseNumber('4')).toBe(4)
  })

  it('devuelve undefined si todavía no hay bodega o el id no es válido', () => {
    expect(toWarehouseNumber('')).toBeUndefined()
    expect(toWarehouseNumber('WH-01')).toBeUndefined()
    expect(toWarehouseNumber('0')).toBeUndefined()
    expect(toWarehouseNumber('-2')).toBeUndefined()
    expect(toWarehouseNumber('1.5')).toBeUndefined()
  })
})

describe('createCartUuid', () => {
  it('crea un identificador no vacío y distinto cada vez', () => {
    const first = createCartUuid()
    expect(first.length).toBeGreaterThan(10)
    expect(createCartUuid()).not.toBe(first)
  })
})
