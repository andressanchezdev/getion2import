// pagination · valores por defecto de página y conversión de la respuesta de un listado a una página lista para la UI
// conecta con: api/types (PageRequest, Paginated); lo usarán los services de cada feature que liste datos (productos, clientes, cartera...)
// ojo: el backend responde { data: [...], meta: {...} }; aquí se convierte una sola vez para que ningún service repita esa lógica
import type { APIResponse, PageRequest, Paginated, PaginatorMetadata } from '../types/api.types'

// filas por página de todas las tablas de la app
export const DEFAULT_PAGE_SIZE = 20

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

// pagina una lista que ya está completa en memoria (para lo que la API no puede filtrar y se filtra aquí, por ejemplo "solo con stock")
export const paginateList = <T>(all: T[], page: number, pageSize: number): Paginated<T> => {
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  return {
    items: all.slice((current - 1) * pageSize, current * pageSize),
    meta: {
      currentPage: current,
      pageSize,
      totalRecords: all.length,
      totalPages,
      hasNextPage: current < totalPages,
      hasPrevPage: current > 1,
    },
  }
}
