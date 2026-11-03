// shop.helpers.test · pruebas de clampQuantity (la cantidad siempre queda entre 1 y el stock)
// conecta con: shop.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import type { CartItem, Product } from '../types/shop.types'
import { clampQuantity, createCartUuid, getBrandModelLabel, buildCartShareText, getAvailableLevels, getFullTitle, getProductDetail, getProductTitle, resolvePriceLevel, splitIncludedTax, toWarehouseNumber } from './shop.helpers'

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

describe('textos de la card y totales con IVA', () => {
  const product = (data: Partial<Product>) => data as Product

  it('usa la descripción como título, o el modelo si es igual o falta', () => {
    expect(getProductTitle(product({ description: 'ACTEVO', modelCompatible: '20W50' }))).toBe('ACTEVO')
    expect(getProductTitle(product({ description: '20w50', modelCompatible: '20W50' }))).toBe('20W50')
  })

  it('el detalle es el modelo; si falta sale de lo que sigue a la descripción en el nombre', () => {
    expect(getProductDetail(product({ description: 'ACEITE', modelCompatible: '15W40' }))).toBe('15W40')
    expect(getProductDetail(product({ name: 'ANILLOS PULSAR 135', description: 'ANILLOS' }))).toBe('PULSAR 135')
    expect(getProductDetail(product({ name: 'ANILLOS', description: 'ANILLOS' }))).toBe('')
    expect(getBrandModelLabel(product({ brand: 'BAJAJ', name: 'ANILLOS PULSAR 135', description: 'ANILLOS' }))).toBe('BAJAJ - PULSAR 135')
  })

  it('el nombre completo une la descripción y su detalle sin repetirlos', () => {
    expect(getFullTitle(product({ name: 'ANILLOS PULSAR 135', description: 'ANILLOS' }))).toBe('ANILLOS PULSAR 135')
    expect(getFullTitle(product({ description: '20w50', modelCompatible: '20W50' }))).toBe('20W50')
  })

  it('arma «MARCA - MODELO» sin sobrantes', () => {
    expect(getBrandModelLabel(product({ brand: 'KIXX', modelCompatible: '15W40' }))).toBe('KIXX - 15W40')
    expect(getBrandModelLabel(product({ brand: 'KIXX' }))).toBe('KIXX')
  })

  it('separa el IVA incluido y siempre suma el total', () => {
    const { subtotal, tax } = splitIncludedTax(11900, 0.19)
    expect(subtotal).toBe(10000)
    expect(subtotal + tax).toBe(11900)
  })
})

describe('buildCartShareText', () => {
  it('arma el resumen del carrito con una línea por producto y el total', () => {
    const item = { product: { name: 'ANILLOS PULSAR 135', description: 'ANILLOS' }, quantity: 2, subtotal: 150000 } as unknown as CartItem
    const text = buildCartShareText([item], 150000)
    expect(text.split('\n')).toEqual(['Mi carrito:', '• ANILLOS PULSAR 135 x2 — $150.000', 'Total: $150.000'])
  })
})

describe('niveles de precio de la tabla de precios', () => {
  const withPrices = (p0: number, p1 = 0, p2 = 0, p3 = 0) => ({ prices: { p0, p1, p2, p3 } }) as unknown as Product

  it('solo cuentan los niveles con precio mayor que 0', () => {
    expect(getAvailableLevels(withPrices(14400))).toEqual(['P0'])
    expect(getAvailableLevels(withPrices(14400, 13000, 0, 11000))).toEqual(['P0', 'P1', 'P3'])
    expect(getAvailableLevels(withPrices(0))).toEqual([])
  })

  it('el nivel pedido se respeta si tiene precio; si no, se usa el primero que sí tiene', () => {
    expect(resolvePriceLevel(withPrices(14400, 13000), 'P1')).toBe('P1')
    expect(resolvePriceLevel(withPrices(14400), 'P2')).toBe('P0')
    expect(resolvePriceLevel(withPrices(0), 'P2')).toBe('P2')
  })
})
