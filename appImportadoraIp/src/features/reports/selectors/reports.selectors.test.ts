// reports.selectors.test · pruebas de los rangos por defecto: se calculan al leer, con la fecha de hoy
// conecta con: reports.selectors; se corre con npm test
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialReportsState } from '../constants/reports.constants'
import { selectDailyRange, selectGeneralRange } from './reports.selectors'

const stateWith = (patch: Partial<ReturnType<typeof createInitialReportsState>> = {}) => ({ reports: { ...createInitialReportsState(), ...patch } })

afterEach(() => vi.useRealTimers())

describe('rangos por defecto', () => {
  it('el diario es hoy y el general son los últimos 30 días hasta hoy', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 10, 0))
    expect(selectDailyRange(stateWith())).toEqual({ start: '2026-10-24', end: '2026-10-24' })
    expect(selectGeneralRange(stateWith())).toEqual({ start: '2026-09-24', end: '2026-10-24' })
  })

  it('si la pestaña sigue abierta al día siguiente, "hoy" avanza sin recargar', () => {
    vi.useFakeTimers()
    // el store entrega un estado nuevo en cada cambio; el selector vuelve a leer la fecha de hoy con cada uno
    vi.setSystemTime(new Date(2026, 9, 24, 23, 50))
    expect(selectDailyRange(stateWith()).end).toBe('2026-10-24')
    vi.setSystemTime(new Date(2026, 9, 25, 0, 10))
    expect(selectDailyRange(stateWith())).toEqual({ start: '2026-10-25', end: '2026-10-25' })
  })

  it('devuelve el mismo objeto mientras no cambie el día (no dispara efectos de más)', () => {
    expect(selectDailyRange(stateWith())).toBe(selectDailyRange(stateWith()))
  })

  it('un rango elegido por el usuario manda sobre el de por defecto', () => {
    const range = { start: '2026-01-01', end: '2026-01-31' }
    expect(selectDailyRange(stateWith({ dailyRange: range }))).toBe(range)
    expect(selectGeneralRange(stateWith({ generalRange: range }))).toBe(range)
  })
})
