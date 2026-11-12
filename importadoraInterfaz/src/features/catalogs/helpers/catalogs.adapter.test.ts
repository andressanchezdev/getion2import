// catalogs.adapter.test · pruebas de la conversión de marcas, categorías y modelos de la API a los de la app
// conecta con: catalogs.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toBrands, toCategories, toMotoModels } from './catalogs.adapter'

describe('toBrands', () => {
  it('conserva id y nombre y convierte imageUrl en image con isActive por defecto true', () => {
    expect(toBrands([{ id: 4, name: 'Yamaha', imageUrl: 'https://x/y.png' }])).toEqual([
      { id: 4, name: 'Yamaha', image: 'https://x/y.png', isActive: true },
    ])
  })

  it('una imagen vacía o nula queda sin imagen', () => {
    expect(toBrands([{ id: 1, name: 'AKT', imageUrl: '' }])[0].image).toBeUndefined()
    expect(toBrands([{ id: 2, name: 'Honda', imageUrl: null }])[0].image).toBeUndefined()
  })

  it('limpia espacios, descarta sin nombre y conserva los inactivos', () => {
    const result = toBrands([
      { id: 1, name: '  Honda  ' },
      { id: 2, name: '   ' },
      { id: 3, name: '' },
      { id: 4, name: 'Vieja', isActive: false },
    ])
    expect(result).toEqual([
      { id: 1, name: 'Honda', image: undefined, isActive: true },
      { id: 4, name: 'Vieja', image: undefined, isActive: false },
    ])
  })
})

describe('toCategories', () => {
  it('conserva el id y permite inactivos descartando los sin nombre', () => {
    expect(
      toCategories([
        { id: 7, name: 'Frenos' },
        { id: 8, name: '' },
        { id: 9, name: 'Cerrada', isActive: false },
      ])
    ).toEqual([
      { id: 7, name: 'Frenos', description: undefined, isActive: true, parentId: null },
      { id: 9, name: 'Cerrada', description: undefined, isActive: false, parentId: null },
    ])
  })
})

describe('toMotoModels', () => {
  it('conserva el id y permite inactivos descartando los sin nombre', () => {
    expect(
      toMotoModels([
        { id: 9, name: ' Boxer CT 100 ' },
        { id: 10, name: ' ' },
        { id: 11, name: 'X', isActive: false },
      ])
    ).toEqual([
      { id: 9, name: 'Boxer CT 100', description: undefined, isActive: true },
      { id: 11, name: 'X', description: undefined, isActive: false },
    ])
  })
})
