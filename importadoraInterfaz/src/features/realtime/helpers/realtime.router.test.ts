// realtime.router.test · verifica ejecución en orden y aislamiento de errores entre manejadores
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRealtimeHandlers, registerRealtimeHandlers, routeRealtimeEvent } from './realtime.router'
import type { RealtimeEvent } from '../types/realtime.contract'
import type { AppDispatch, RootState } from '@/app/store/store'

describe('realtime.router', () => {
  beforeEach(() => {
    clearRealtimeHandlers()
  })

  it('ejecuta varios manejadores por tipo en orden y uno que lanza error no detiene a los demás', () => {
    const calls: string[] = []
    const dispatch = vi.fn() as unknown as AppDispatch
    const getState = vi.fn(() => ({}) as RootState)

    registerRealtimeHandlers({
      'stock.changed': [
        () => {
          calls.push('primero')
        },
        () => {
          calls.push('segundo-lanza')
          throw new Error('fallo aislado')
        },
        () => {
          calls.push('tercero')
        },
      ],
    })

    const event: RealtimeEvent = {
      v: 1,
      seq: 7,
      id: 'evt-7',
      type: 'stock.changed',
      occurredAt: '2026-11-12T15:00:00Z',
      companyId: 1,
      warehouseIds: [1],
      actor: { type: 'employee', id: 2, name: 'Luis' },
      data: {
        cause: { type: 'adjustment', referenceType: 'manual', referenceId: null, referenceSerial: null },
        rows: [],
        totals: [],
      },
    }

    expect(() => routeRealtimeEvent(event, { dispatch, getState })).not.toThrow()
    expect(calls).toEqual(['primero', 'segundo-lanza', 'tercero'])
  })
})

