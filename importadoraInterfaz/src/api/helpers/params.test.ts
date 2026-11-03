// params.test · pruebas de los parámetros de consulta de los listados
// conecta con: api/params; se corre con npm test
import { describe, expect, it } from 'vitest'
import { compactParams, withCompany } from './params'

describe('compactParams', () => {
  it('quita undefined, null y texto vacío, y conserva 0 y false', () => {
    expect(compactParams({ a: 1, b: undefined, c: null, d: '', e: 0, f: false, g: 'x' })).toEqual({ a: 1, e: 0, f: false, g: 'x' })
  })
})

describe('withCompany', () => {
  it('agrega companyId cuando existe', () => {
    expect(withCompany(3, { page: 1 })).toEqual({ companyId: 3, page: 1 })
  })

  it('no manda companyId para el superadmin (0 o sin compañía)', () => {
    expect(withCompany(0, { page: 1 })).toEqual({ page: 1 })
    expect(withCompany(undefined)).toEqual({})
  })
})
