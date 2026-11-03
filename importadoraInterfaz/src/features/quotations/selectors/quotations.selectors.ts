// quotations.selectors · lecturas del estado de cotizaciones: filtradas por texto y fechas y paginadas en pantalla
// conecta con: quotations.slice (estado), quotations.adapter (filtra), api/pagination (paginateList), QuotationsScreen y sus componentes
import { createSelector } from '@reduxjs/toolkit'
import { paginateList } from '@/api'
import { QUOTATIONS_PAGE_SIZE } from '../constants/quotations.constants'
import { filterQuotations } from '../helpers/quotations.adapter'
import type { QuotationsState } from '../types/quotations.types'

type QuotationsRootState = { quotations: QuotationsState }

// lee el estado de carga de la lista de cotizaciones
export const selectQuotationsStatus = (state: QuotationsRootState) => state.quotations.list.status
// lee el mensaje de error de la lista de cotizaciones
export const selectQuotationsError = (state: QuotationsRootState) => state.quotations.list.error
// lee los filtros de cotizaciones (texto y fechas)
export const selectQuotationFilters = (state: QuotationsRootState) => state.quotations.filters
// lee el detalle de la cotización abierta
export const selectQuotationDetail = (state: QuotationsRootState) => state.quotations.detail

const selectQuotationListItems = (state: QuotationsRootState) => state.quotations.list.items
const selectQuotationPageNumber = (state: QuotationsRootState) => state.quotations.list.page

const selectFiltered = createSelector(
  [selectQuotationListItems, selectQuotationFilters],
  (items, filters) => filterQuotations(items, filters)
)

// la página actual de lo filtrado (y sus metadatos para el paginador)
export const selectQuotationsPage = createSelector(
  [selectFiltered, selectQuotationPageNumber],
  (filtered, page) => paginateList(filtered, page, QUOTATIONS_PAGE_SIZE)
)

// los items específicos para la tabla de cotizaciones
export const selectQuotationsTableItems = createSelector(
  [selectQuotationsPage],
  (page) => page.items
)

export const selectHasQuotationFilters = createSelector(
  [selectQuotationFilters],
  (filters) => Boolean(filters.search || filters.from || filters.to)
)
