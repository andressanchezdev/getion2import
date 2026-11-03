// usePagedList · pagina en pantalla una lista que ya está completa en memoria (20 filas por página) y entrega los metadatos para el paginador
// conecta con: las tablas que cargan todo de una vez (traslados, pedidos, empleados, abonos...) y global Pagination; usa paginateList de api
// ojo: si la lista se acorta (por un filtro) y la página actual ya no existe, muestra la última; `resetKey` vuelve a la página 1 cuando cambia (por ejemplo los filtros)
import { useState } from 'react'
import { DEFAULT_PAGE_SIZE, paginateList, type PaginatorMetadata } from '@/api'

export const usePagedList = <T>(items: T[], resetKey?: unknown, pageSize: number = DEFAULT_PAGE_SIZE): { pageItems: T[]; meta: PaginatorMetadata; setPage: (page: number) => void } => {
  // la página se guarda junto con la llave con la que se eligió; si la llave cambia, esa página ya no vale y se vuelve a la 1 (sin efectos)
  const [selection, setSelection] = useState({ page: 1, key: resetKey })
  const page = Object.is(selection.key, resetKey) ? selection.page : 1
  const setPage = (next: number) => setSelection({ page: next, key: resetKey })

  const { items: pageItems, meta } = paginateList(items, page, pageSize)
  return { pageItems, meta, setPage }
}
