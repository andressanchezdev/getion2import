// useAsyncValidation.test · pruebas del hook de validación asíncrona en tiempo real
// conecta con: useAsyncValidation y vitest; la consulta de "ya existe" está simulada (no hay red)
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncValidation } from './useAsyncValidation'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAsyncValidation', () => {
  it('valida correo duplicado con debounce de 500ms', async () => {
    const exists = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() => useAsyncValidation(exists))

    act(() => {
      result.current.validateEmailDebounced('test@empresa.com')
    })
    expect(exists).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(exists).toHaveBeenCalledWith('email', 'test@empresa.com')
    expect(result.current.emailAsyncError).toContain('ya se encuentra registrado')
  })

  it('valida documento duplicado con debounce de 500ms', async () => {
    const exists = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() => useAsyncValidation(exists))

    act(() => {
      result.current.validateDocumentDebounced('12345678')
    })
    expect(exists).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(exists).toHaveBeenCalledWith('document', '12345678')
    expect(result.current.docAsyncError).toContain('ya se encuentra registrado')
  })

  it('si no existe no hay error, y un documento corto ni siquiera se consulta', async () => {
    const exists = vi.fn().mockResolvedValue(false)
    const { result } = renderHook(() => useAsyncValidation(exists))

    act(() => {
      result.current.validateDocumentDebounced('123')
      result.current.validateEmailDebounced('otro@empresa.com')
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(exists).toHaveBeenCalledTimes(1)
    expect(result.current.docAsyncError).toBeNull()
    expect(result.current.emailAsyncError).toBeNull()
  })

  it('si la consulta falla no bloquea el formulario', async () => {
    const exists = vi.fn().mockRejectedValue(new Error('sin red'))
    const { result } = renderHook(() => useAsyncValidation(exists))

    act(() => {
      result.current.validateDocumentDebounced('12345678')
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.docAsyncError).toBeNull()
  })
})
