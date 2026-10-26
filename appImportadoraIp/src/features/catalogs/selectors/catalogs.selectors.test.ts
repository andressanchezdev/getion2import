// catalogs.selectors.test · pruebas de los nombres de marcas y categorías que alimentan los filtros
// conecta con: catalogs.selectors; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_CATALOGS_STATE } from '../constants/catalogs.constants'
import { selectBrandNames, selectCategoryNames } from './catalogs.selectors'
import type { CatalogsState } from '../types/catalogs.types'

const stateWith = (patch: Partial<CatalogsState>): { catalogs: CatalogsState } => ({
  catalogs: { ...INITIAL_CATALOGS_STATE, ...patch },
})

describe('catalogs.selectors', () => {
  it('sin datos devuelve listas vacías', () => {
    const state = stateWith({})
    expect(selectBrandNames(state)).toEqual([])
    expect(selectCategoryNames(state)).toEqual([])
  })

  it('devuelve los nombres en el orden del backend', () => {
    const state = stateWith({
      brands: {
        items: [
          { id: 1, name: 'Yamaha' },
          { id: 2, name: 'Honda' },
        ],
        status: 'succeeded',
        error: null,
      },
    })
    expect(selectBrandNames(state)).toEqual(['Yamaha', 'Honda'])
  })

  it('no repite nombres iguales', () => {
    const state = stateWith({
      categories: {
        items: [
          { id: 1, name: 'Motor' },
          { id: 2, name: 'Motor' },
          { id: 3, name: 'Frenos' },
        ],
        status: 'succeeded',
        error: null,
      },
    })
    expect(selectCategoryNames(state)).toEqual(['Motor', 'Frenos'])
  })
})
