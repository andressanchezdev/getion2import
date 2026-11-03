// pagination.test · pruebas de la conversión de la respuesta de un listado a { items, meta }
// conecta con: api/pagination; se corre con npm test
import { describe, expect, it } from 'vitest'
import { EMPTY_META, FIRST_PAGE, DEFAULT_PAGE_SIZE, paginateList, toPaginated } from './pagination'
import type { APIResponse, PaginatorMetadata } from '../types/api.types'

const meta: PaginatorMetadata = {
  currentPage: 2,
  pageSize: 30,
  totalRecords: 75,
  totalPages: 3,
  hasNextPage: true,
  hasPrevPage: true,
}

describe('toPaginated', () => {
  it('separa los registros y los metadatos', () => {
    const response: APIResponse<number[]> = { success: true, message: '', data: [1, 2, 3], meta }
    expect(toPaginated(response)).toEqual({ items: [1, 2, 3], meta })
  })

  it('con data nulo devuelve una lista vacía', () => {
    const response: APIResponse<number[] | null> = { success: true, message: '', data: null, meta }
    expect(toPaginated(response).items).toEqual([])
  })

  it('sin meta usa los metadatos vacíos', () => {
    const response: APIResponse<number[]> = { success: true, message: '', data: [1] }
    expect(toPaginated(response).meta).toEqual(EMPTY_META)
  })

  it('la primera página usa el tamaño por defecto', () => {
    expect(FIRST_PAGE).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  })
})

describe('paginateList', () => {
  const all = Array.from({ length: 70 }, (_, i) => i + 1)

  it('devuelve la página pedida y sus metadatos', () => {
    const page = paginateList(all, 2, 30)
    expect(page.items[0]).toBe(31)
    expect(page.items).toHaveLength(30)
    expect(page.meta).toMatchObject({ currentPage: 2, totalRecords: 70, totalPages: 3, hasNextPage: true, hasPrevPage: true })
  })

  it('la última página trae lo que sobra y no tiene siguiente', () => {
    const page = paginateList(all, 3, 30)
    expect(page.items).toHaveLength(10)
    expect(page.meta.hasNextPage).toBe(false)
  })

  it('una página fuera de rango se lleva a la última; una lista vacía queda en la página 1', () => {
    expect(paginateList(all, 99, 30).meta.currentPage).toBe(3)
    expect(paginateList([], 1, 30).meta).toMatchObject({ currentPage: 1, totalPages: 1, totalRecords: 0, hasNextPage: false })
  })
})
