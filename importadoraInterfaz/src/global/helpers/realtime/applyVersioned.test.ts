// applyVersioned.test · verifica comparación de versiones ISO (más nuevo aplica, igual o más viejo no, sin versión previa aplica)
import { describe, expect, it } from 'vitest'
import { applyVersioned, isNewer } from './applyVersioned'

describe('applyVersioned', () => {
  it('aplica cuando no hay versión previa', () => {
    expect(isNewer('2026-11-12T15:00:00.000001Z', null)).toBe(true)
    expect(isNewer('2026-11-12T15:00:00.000001Z', undefined)).toBe(true)
    expect(
      applyVersioned(null, { id: 1, name: 'Nuevo', updatedAt: '2026-11-12T15:00:00Z' })
    ).toEqual({ id: 1, name: 'Nuevo', updatedAt: '2026-11-12T15:00:00Z' })
  })

  it('aplica cuando la versión entrante es más nueva (incluso al microsegundo)', () => {
    const current = { id: 1, name: 'Antes', updatedAt: '2026-11-12T15:04:05.120001Z' }
    const newer = { id: 1, name: 'Después', updatedAt: '2026-11-12T15:04:05.120002Z' }

    expect(isNewer(newer.updatedAt, current.updatedAt)).toBe(true)
    expect(applyVersioned(current, newer)).toBe(newer)
  })

  it('conserva el actual cuando la versión entrante es igual o más vieja', () => {
    const current = { id: 1, name: 'Actual', updatedAt: '2026-11-12T15:04:05.500000Z' }
    const same = { id: 1, name: 'Repetido', updatedAt: '2026-11-12T15:04:05.500000Z' }
    const older = { id: 1, name: 'Viejo', updatedAt: '2026-11-12T15:04:04.999999Z' }

    expect(isNewer(same.updatedAt, current.updatedAt)).toBe(false)
    expect(isNewer(older.updatedAt, current.updatedAt)).toBe(false)
    expect(applyVersioned(current, same)).toBe(current)
    expect(applyVersioned(current, older)).toBe(current)
  })
})

