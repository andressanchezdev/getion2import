// pagination · valores por defecto de página y conversión de la respuesta de un listado a una página lista para la UI
// conecta con: api/types (PageRequest, Paginated); lo usarán los services de cada feature que liste datos (productos, clientes, cartera...)
// ojo: el backend responde { data: [...], meta: {...} }; aquí se convierte una sola vez para que ningún service repita esa lógica
import type { APIResponse, PageRequest, Paginated, PaginatorMetadata } from './types/api.types'

export const DEFAULT_PAGE_SIZE = 30

export const FIRST_PAGE: PageRequest = { page: 1, pageSize: DEFAULT_PAGE_SIZE }

// metadatos de una lista vacía (por si el backend no manda meta)
export const EMPTY_META: PaginatorMetadata = {
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
}

// convierte la respuesta de un listado en { items, meta }; si data viene vacío o nulo devuelve una lista vacía
export const toPaginated = <T>(response: APIResponse<T[] | null | undefined>): Paginated<T> => ({
  items: response.data ?? [],
  meta: response.meta ?? EMPTY_META,
})
