// Pagination.test · pruebas del paginador: texto, botones habilitados según el meta, avisar la página pedida y ocultarse con una sola página
// conecta con: Pagination; se corre con npm test (usa un navegador simulado, jsdom)
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'
import type { PaginatorMetadata } from '@/api'

const meta = (patch: Partial<PaginatorMetadata> = {}): PaginatorMetadata => ({
  currentPage: 2,
  pageSize: 30,
  totalRecords: 75,
  totalPages: 3,
  hasNextPage: true,
  hasPrevPage: true,
  ...patch,
})

// ojo: sin globals de vitest, Testing Library no limpia solo la pantalla entre pruebas: se hace aquí
afterEach(cleanup)

describe('Pagination', () => {
  it('muestra "Página X de Y"', () => {
    render(<Pagination meta={meta()} onPageChange={() => undefined} />)
    expect(screen.getByText('Página 2 de 3')).toBeTruthy()
  })

  it('Siguiente y Anterior piden la página vecina', () => {
    const onPageChange = vi.fn()
    render(<Pagination meta={meta()} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Anterior'))
    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1)
  })

  it('en la primera página Anterior está deshabilitado; en la última, Siguiente', () => {
    const { rerender } = render(<Pagination meta={meta({ currentPage: 1, hasPrevPage: false })} onPageChange={() => undefined} />)
    expect((screen.getByText('Anterior') as HTMLButtonElement).disabled).toBe(true)
    rerender(<Pagination meta={meta({ currentPage: 3, hasNextPage: false })} onPageChange={() => undefined} />)
    expect((screen.getByText('Siguiente') as HTMLButtonElement).disabled).toBe(true)
  })

  it('mientras carga (disabled) bloquea los dos botones', () => {
    render(<Pagination meta={meta()} disabled onPageChange={() => undefined} />)
    expect((screen.getByText('Anterior') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByText('Siguiente') as HTMLButtonElement).disabled).toBe(true)
  })

  it('con una sola página no se muestra', () => {
    const { container } = render(<Pagination meta={meta({ totalPages: 1, hasNextPage: false, hasPrevPage: false })} onPageChange={() => undefined} />)
    expect(container.firstChild).toBeNull()
  })
})
