// customers.realtime.test · entity.status_changed respeta la versión (16.5) y una carga tardía no pisa la fila nueva (16.9)
import { describe, expect, it } from 'vitest'
import { applyVersionedStatus, mergeVersionedList } from '@/global/helpers/realtime/applyVersioned'
import { customersReducer, customerStatusFromEvent } from '../slices/customers.slice'

const NEW = '2026-11-12T10:05:00.000001Z'
const OLD = '2026-11-12T10:00:00.000000Z'

describe('customers realtime versionado', () => {
  it('un evento viejo no cambia el estado tras uno nuevo', () => {
    const base = customersReducer(undefined, { type: '@@init' })
    const seeded = { ...base, list: { ...base.list, items: [{ id: 7, isActive: true } as (typeof base.list.items)[number]] } }
    const afterNew = customersReducer(seeded, customerStatusFromEvent({ id: 7, isActive: false, version: NEW }))
    const afterOld = customersReducer(afterNew, customerStatusFromEvent({ id: 7, isActive: true, version: OLD }))
    expect(afterNew.list.items[0].isActive).toBe(false)
    expect(afterOld.list.items[0].isActive).toBe(false)
  })
})

describe('applyVersionedStatus / mergeVersionedList', () => {
  it('anota la versión y rechaza una anterior', () => {
    const row: { isActive: boolean; updatedAt?: string } = { isActive: true }
    expect(applyVersionedStatus(row, false, NEW)).toBe(true)
    expect(applyVersionedStatus(row, true, OLD)).toBe(false)
    expect(row).toEqual({ isActive: false, updatedAt: NEW })
  })
  it('la carga HTTP con versión vieja conserva la fila nueva; sin versión gana la carga', () => {
    const current = [{ id: 1, isActive: false, updatedAt: NEW }, { id: 2, isActive: true, updatedAt: NEW }]
    const merged = mergeVersionedList(current, [{ id: 1, isActive: true, updatedAt: OLD }, { id: 2, isActive: false }], (r) => r.id)
    expect(merged[0]).toBe(current[0])
    expect(merged[1].isActive).toBe(false)
  })
})
