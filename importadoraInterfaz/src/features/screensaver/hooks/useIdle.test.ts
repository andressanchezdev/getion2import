// useIdle.test · pruebas de la espera de inactividad del protector de pantalla y de cómo se despierta (solo al soltar el clic; el teclado no la despierta)
// conecta con: useIdle; usa un reloj falso para no esperar de verdad; se corre con npm test
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCREENSAVER_TIMING } from '../constants/screensaver.constants'
import { useIdle } from './useIdle'

const IDLE = SCREENSAVER_TIMING.IDLE_MS

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const fire = (event: Event) => act(() => void window.dispatchEvent(event))
const move = (x: number, y: number) => fire(new MouseEvent('mousemove', { clientX: x, clientY: y }))

describe('useIdle', () => {
  it('el tiempo por defecto es de 70 segundos (valor de prueba; el definitivo son 5 minutos)', () => {
    expect(SCREENSAVER_TIMING.IDLE_MS).toBe(70 * 1000)
  })

  it('empieza despierto y sigue así antes del tiempo de espera', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE - 2000)
    expect(result.current).toBe(false)
  })

  it('se duerme al cumplirse el tiempo de espera sin actividad', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE + 1000)
    expect(result.current).toBe(true)
  })

  it('la actividad reinicia la espera', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE - 2000)
    fire(new KeyboardEvent('keydown', { key: 'a' }))
    advance(IDLE - 2000)
    expect(result.current).toBe(false)
    advance(3000)
    expect(result.current).toBe(true)
  })

  it('una tecla NO la despierta', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE + 1000)
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
    fire(new KeyboardEvent('keydown', { key: 'a' }))
    expect(result.current).toBe(true)
  })

  it('durante el instante de gracia la actividad no la despierta', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE) // se duerme justo al cumplirse el tiempo
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS - 100)
    fire(new MouseEvent('mouseup'))
    expect(result.current).toBe(true)
  })

  it('mover el mouse o la rueda no la despierta', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE + 1000)
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
    move(100, 100)
    move(600, 400)
    fire(new WheelEvent('wheel'))
    expect(result.current).toBe(true)
  })

  it('apretar el clic no la despierta, soltarlo sí', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE + 1000)
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
    fire(new MouseEvent('mousedown'))
    expect(result.current).toBe(true)
    fire(new MouseEvent('mouseup'))
    expect(result.current).toBe(false)
  })

  it('las teclas se tragan mientras duerme: no llegan a la pantalla de abajo', () => {
    renderHook(() => useIdle())
    advance(IDLE + 1000)
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
    const key = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    fire(key)
    expect(key.defaultPrevented).toBe(true)
  })

  it('despierta y después del tiempo de espera vuelve a dormirse', () => {
    const { result } = renderHook(() => useIdle())
    advance(IDLE + 1000)
    advance(SCREENSAVER_TIMING.WAKE_GRACE_MS)
    fire(new MouseEvent('mouseup'))
    expect(result.current).toBe(false)
    advance(IDLE + 1000)
    expect(result.current).toBe(true)
  })

  it('al desmontarse deja de escuchar', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useIdle())
    unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function), true)
    remove.mockRestore()
  })
})
