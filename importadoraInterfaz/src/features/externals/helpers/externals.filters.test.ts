import { describe, expect, it } from 'vitest'
import { filterExternals } from './externals.filters'
import type { ExternalEntity } from '../types/externals.types'

const item = (over: Partial<ExternalEntity>): ExternalEntity => ({ id: 1, companyId: 1, kind: 'supplier', documentType: 'NIT', name: 'Repuestos del Norte', termsDays: 0, creditLimit: 0, isActive: true, createdAt: '', updatedAt: '', ...over })

describe('filterExternals', () => {
  const list = [item({ id: 1 }), item({ id: 2, name: 'Frenos Sur', document: '900123', city: 'Cali', isActive: false }), item({ id: 3, name: 'Motores', contactName: 'Ana Ruiz', phone: '3001112233' })]

  it('sin filtros devuelve todo', () => {
    expect(filterExternals(list, '', 'all')).toHaveLength(3)
  })

  it('busca por nombre, documento, contacto, ciudad o teléfono sin importar mayúsculas', () => {
    expect(filterExternals(list, 'NORTE', 'all').map((i) => i.id)).toEqual([1])
    expect(filterExternals(list, '900123', 'all').map((i) => i.id)).toEqual([2])
    expect(filterExternals(list, 'ana', 'all').map((i) => i.id)).toEqual([3])
    expect(filterExternals(list, 'cali', 'all').map((i) => i.id)).toEqual([2])
    expect(filterExternals(list, '300111', 'all').map((i) => i.id)).toEqual([3])
  })

  it('filtra por estado y combina con la búsqueda', () => {
    expect(filterExternals(list, '', 'active').map((i) => i.id)).toEqual([1, 3])
    expect(filterExternals(list, '', 'inactive').map((i) => i.id)).toEqual([2])
    expect(filterExternals(list, 'frenos', 'active')).toEqual([])
  })
})
