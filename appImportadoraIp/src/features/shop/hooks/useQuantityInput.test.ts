// useQuantityInput.test · pruebas del contador de cantidad: botones, texto escrito, flechas del teclado y límite de stock
// conecta con: useQuantityInput; se corre con npm test
import { act, renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useQuantityInput } from './useQuantityInput'

// evento de teclado mínimo para probar las flechas sin un navegador real
const arrow = (key: 'ArrowUp' | 'ArrowDown' | 'Enter') =>
  ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLInputElement>

describe('useQuantityInput', () => {
  it('empieza en 1', () => {
    const { result } = renderHook(() => useQuantityInput(10))
    expect(result.current.quantity).toBe(1)
    expect(result.current.text).toBe('1')
  })

  it('los botones suman y restan sin pasar de 1 ni del stock', () => {
    const { result } = renderHook(() => useQuantityInput(3))
    act(() => result.current.decrement())
    expect(result.current.quantity).toBe(1)
    act(() => result.current.increment())
    act(() => result.current.increment())
    act(() => result.current.increment())
    expect(result.current.quantity).toBe(3)
  })

  it('escribir deja pasar solo dígitos y no confirma hasta salir del campo', () => {
    const { result } = renderHook(() => useQuantityInput(50))
    act(() => result.current.handleChange('a1b2'))
    expect(result.current.text).toBe('12')
    expect(result.current.quantity).toBe(1)
    act(() => result.current.handleBlur())
    expect(result.current.quantity).toBe(12)
    expect(result.current.text).toBe('12')
  })

  it('se puede vaciar el campo y al salir queda en 1', () => {
    const { result } = renderHook(() => useQuantityInput(50))
    act(() => result.current.handleChange('7'))
    act(() => result.current.handleBlur())
    act(() => result.current.handleChange(''))
    expect(result.current.text).toBe('')
    act(() => result.current.handleBlur())
    expect(result.current.quantity).toBe(1)
  })

  it('un número mayor al stock queda en el stock', () => {
    const { result } = renderHook(() => useQuantityInput(42))
    act(() => result.current.handleChange('999'))
    act(() => result.current.handleBlur())
    expect(result.current.quantity).toBe(42)
  })

  it('commitDraft confirma lo escrito y devuelve la cantidad final (lo usa "Ordenar")', () => {
    const { result } = renderHook(() => useQuantityInput(20))
    act(() => result.current.handleChange('15'))
    let committed = 0
    act(() => {
      committed = result.current.commitDraft()
    })
    expect(committed).toBe(15)
  })

  it('las flechas suben y bajan de 1 en 1 y respetan los límites', () => {
    const { result } = renderHook(() => useQuantityInput(3))
    const up = arrow('ArrowUp')
    act(() => result.current.handleKeyDown(up))
    act(() => result.current.handleKeyDown(arrow('ArrowUp')))
    act(() => result.current.handleKeyDown(arrow('ArrowUp')))
    expect(result.current.quantity).toBe(3)
    expect(up.preventDefault).toHaveBeenCalled()
    act(() => result.current.handleKeyDown(arrow('ArrowDown')))
    expect(result.current.quantity).toBe(2)
  })

  it('otras teclas no cambian nada', () => {
    const { result } = renderHook(() => useQuantityInput(10))
    const enter = arrow('Enter')
    act(() => result.current.handleKeyDown(enter))
    expect(result.current.quantity).toBe(1)
    expect(enter.preventDefault).not.toHaveBeenCalled()
  })

  it('si baja el stock, la cantidad se ajusta sola', () => {
    const { result, rerender } = renderHook(({ max }) => useQuantityInput(max), { initialProps: { max: 20 } })
    act(() => result.current.handleChange('15'))
    act(() => result.current.handleBlur())
    rerender({ max: 5 })
    expect(result.current.quantity).toBe(5)
  })

  it('sin stock la cantidad es 0', () => {
    const { result } = renderHook(() => useQuantityInput(0))
    expect(result.current.quantity).toBe(0)
  })
})
