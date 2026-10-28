// pagination.test · pruebas de la conversión de la respuesta de un listado a { items, meta }
// conecta con: api/pagination; se corre con npm test
import { describe, expect, it } from 'vitest'
import { EMPTY_META, FIRST_PAGE, DEFAULT_PAGE_SIZE, toPaginated } from './pagination'
import type { APIResponse, PaginatorMetadata } from './types/api.types'

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
