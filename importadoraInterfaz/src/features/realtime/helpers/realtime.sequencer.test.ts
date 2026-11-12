// realtime.sequencer.test · verifica descarte de duplicados, avance con watermark, system.* con seq 0 y saltos de seq
import { describe, expect, it } from 'vitest'
import { createRealtimeSequencer, evaluateRealtimeSequence } from './realtime.sequencer'
import type { RealtimeEvent } from '../types/realtime.contract'

const makeEvent = (overrides: Partial<RealtimeEvent> & { type: RealtimeEvent['type'] }): RealtimeEvent =>
  ({
    v: 1,
    seq: 1,
    id: 'evt-1',
    occurredAt: '2026-11-12T15:00:00Z',
    companyId: 1,
    warehouseIds: [],
    actor: { type: 'system', id: null, name: 'Sistema' },
    data: {},
    ...overrides,
  }) as RealtimeEvent

describe('realtime.sequencer', () => {
  it('descarta duplicados o menores y avanza lastSeq con mayores', () => {
    const seq = createRealtimeSequencer(10)

    expect(seq.accept(makeEvent({ type: 'sale.created', seq: 10 }))).toBe(false)
    expect(seq.accept(makeEvent({ type: 'sale.created', seq: 8 }))).toBe(false)
    expect(seq.getLastSeq()).toBe(10)

    expect(seq.accept(makeEvent({ type: 'sale.created', seq: 11 }))).toBe(true)
    expect(seq.getLastSeq()).toBe(11)
  })

  it('system.watermark avanza lastSeq sin entregar nada a los manejadores', () => {
    const decision = evaluateRealtimeSequence(
      makeEvent({
        type: 'system.watermark',
        seq: 0,
        data: { seq: 55 },
      }),
      20
    )

    expect(decision.accepted).toBe(true)
    expect(decision.deliver).toBe(false)
    expect(decision.nextLastSeq).toBe(55)
  })

  it('system.* con seq 0 pasa sin retroceder lastSeq', () => {
    const seq = createRealtimeSequencer(30)
    const delivered = seq.accept(
      makeEvent({
        type: 'system.replay_completed',
        seq: 0,
        data: { fromSeq: 25, toSeq: 30, count: 5 },
      })
    )

    expect(delivered).toBe(true)
    expect(seq.getLastSeq()).toBe(30)
  })

  it('acepta saltos de seq sin tratarlos como error (sección 16.3)', () => {
    const seq = createRealtimeSequencer(10)
    expect(seq.accept(makeEvent({ type: 'stock.changed', seq: 42 }))).toBe(true)
    expect(seq.getLastSeq()).toBe(42)
  })
})

