// useAsyncValidation.test · pruebas del hook de validación asíncrona en tiempo real
// conecta con: useAsyncValidation, apiClient y vitest
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncValidation } from './useAsyncValidation'
import { apiClient } from '@/api'

vi.mock('@/api', async () => {
  const actual = await vi.importActual<any>('@/api')
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
  }
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAsyncValidation', () => {
  it('valida correo duplicado con debounce de 500ms', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: { exists: true } },
    } as any)

    const { result } = renderHook(() => useAsyncValidation())

    act(() => {
      result.current.validateEmailDebounced('test@empresa.com', 1)
    })

    expect(apiClient.post).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(result.current.emailAsyncError).toContain('ya se encuentra registrado')
  })

  it('valida documento duplicado con debounce de 500ms', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: { exists: true } },
    } as any)

    const { result } = renderHook(() => useAsyncValidation())

    act(() => {
      result.current.validateDocumentDebounced('12345678', 'CC')
    })

    expect(apiClient.post).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(result.current.docAsyncError).toContain('ya se encuentra registrado')
  })
})
