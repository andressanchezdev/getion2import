// priceTier.test · pruebas de la conversión entre los niveles de precio de la app (P0..P3) y los de la API (p1..p4)
// conecta con: priceTier; se corre con npm test
import { describe, expect, it } from 'vitest'
import { fromApiPriceTier, toApiPriceTier } from './priceTier'

describe('priceTier', () => {
  it('P0..P3 son p1..p4', () => {
    expect(['P0', 'P1', 'P2', 'P3'].map((level) => toApiPriceTier(level as 'P0'))).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('p1..p4 son P0..P3, sin importar mayúsculas ni espacios', () => {
    expect(['p1', 'P2', ' p3 ', 'p4'].map(fromApiPriceTier)).toEqual(['P0', 'P1', 'P2', 'P3'])
  })

  it('un valor desconocido o vacío queda sin definir', () => {
    expect(fromApiPriceTier('p9')).toBeUndefined()
    expect(fromApiPriceTier('')).toBeUndefined()
    expect(fromApiPriceTier(null)).toBeUndefined()
  })
})
