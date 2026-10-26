// useDebouncedValue.test · pruebas de la espera antes de usar un valor que cambia seguido (por ejemplo lo que se escribe)
// conecta con: useDebouncedValue; usa un reloj falso para no esperar de verdad; se corre con npm test
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('empieza con el valor inicial', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('no cambia hasta que pasa el tiempo sin nuevos cambios', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } })
    rerender({ value: 'ab' })
    act(() => void vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab')
  })

  it('si sigue cambiando, reinicia la espera y se queda con el último', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } })
    rerender({ value: 'ab' })
    act(() => void vi.advanceTimersByTime(200))
    rerender({ value: 'abc' })
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(100))
    expect(result.current).toBe('abc')
  })
})
