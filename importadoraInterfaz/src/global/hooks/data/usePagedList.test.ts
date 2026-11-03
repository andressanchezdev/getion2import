import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagedList } from './usePagedList'

const rows = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagedList', () => {
  it('muestra 20 filas por página', () => {
    const { result } = renderHook(() => usePagedList(rows(45)))
    expect(result.current.pageItems).toHaveLength(20)
    expect(result.current.meta).toMatchObject({ currentPage: 1, totalPages: 3, totalRecords: 45, hasNextPage: true })
  })

  it('cambia de página y la última trae el resto', () => {
    const { result } = renderHook(() => usePagedList(rows(45)))
    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([41, 42, 43, 44, 45])
    expect(result.current.meta.hasNextPage).toBe(false)
  })

  it('si la lista se acorta muestra la última página que exista', () => {
    const { result, rerender } = renderHook(({ list }) => usePagedList(list), { initialProps: { list: rows(45) } })
    act(() => result.current.setPage(3))
    rerender({ list: rows(25) })
    expect(result.current.meta.currentPage).toBe(2)
  })

  it('vuelve a la página 1 cuando cambia la llave (los filtros)', () => {
    const { result, rerender } = renderHook(({ key }) => usePagedList(rows(45), key), { initialProps: { key: 'a' } })
    act(() => result.current.setPage(2))
    expect(result.current.meta.currentPage).toBe(2)
    rerender({ key: 'b' })
    expect(result.current.meta.currentPage).toBe(1)
  })
})
