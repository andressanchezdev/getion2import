// returns.selectors · lecturas derivadas del estado de devoluciones (tabla filtrada y conteos de los KPIs)
// conecta con: ReturnsScreen y sus componentes; leen state.returns
import { createSelector } from '@reduxjs/toolkit'
import { countReturns, filterReturns } from '../helpers/returns.helpers'
import type { ReturnsState } from '../types/returns.types'

// forma mínima del state que necesitan estos selectors (así la feature no importa el store de app)
type ReturnsRoot = { returns: ReturnsState }

export const selectReturns = (state: ReturnsRoot) => state.returns
// lee todas las devoluciones cargadas, sin filtrar
export const selectAllReturns = (state: ReturnsRoot) => state.returns.items

// la tabla con estado y búsqueda aplicados (el filtro de bodega lo hace el backend)
export const selectVisibleReturns = createSelector(
  [(state: ReturnsRoot) => state.returns.items, (state: ReturnsRoot) => state.returns.status, (state: ReturnsRoot) => state.returns.query],
  filterReturns
)

export const selectReturnsCounts = createSelector([selectAllReturns], countReturns)
