// catalogs.adapter.test · pruebas de la conversión de marcas, categorías y modelos del backend a los de la app
// conecta con: catalogs.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { toBrands, toCategories, toMotoModels } from './catalogs.adapter'

describe('toBrands', () => {
  it('convierte brandId a id y conserva nombre e imagen', () => {
    expect(toBrands([{ brandId: 4, name: 'Yamaha', image: 'https://x/y.png' }])).toEqual([
      { id: 4, name: 'Yamaha', image: 'https://x/y.png' },
    ])
  })

  it('una imagen vacía queda sin imagen', () => {
    expect(toBrands([{ brandId: 1, name: 'AKT', image: '' }])[0].image).toBeUndefined()
  })

  it('limpia espacios y descarta registros sin nombre', () => {
    const result = toBrands([
      { brandId: 1, name: '  Honda  ' },
      { brandId: 2, name: '   ' },
      { brandId: 3, name: '' },
    ])
    expect(result).toEqual([{ id: 1, name: 'Honda', image: undefined }])
  })
})

describe('toCategories', () => {
  it('convierte categoryId a id y descarta los sin nombre', () => {
    expect(toCategories([{ categoryId: 7, name: 'Frenos' }, { categoryId: 8, name: '' }])).toEqual([{ id: 7, name: 'Frenos' }])
  })
})

describe('toMotoModels', () => {
  it('convierte modelId a id y descarta los sin nombre', () => {
    expect(toMotoModels([{ modelId: 9, name: ' Boxer CT 100 ' }, { modelId: 10, name: ' ' }])).toEqual([{ id: 9, name: 'Boxer CT 100' }])
  })
})
