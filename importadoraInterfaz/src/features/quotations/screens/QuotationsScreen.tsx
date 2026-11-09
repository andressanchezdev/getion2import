// QuotationsScreen · Tienda > Historial cotizaciones: búsqueda, filtro por fechas y la tabla de las cotizaciones hechas (se crean en Tienda > Cotizar)
// conecta con: useQuotationsLoader (las pide), QuotationsToolbar, QuotationsTable y global Pagination; la monta MainContent (screenRegistry)
import React from 'react'
import './QuotationsScreen.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { QuotationsTable } from '../components/table/QuotationsTable'
import { QuotationsToolbar } from '../components/toolbar/QuotationsToolbar'
import { useQuotationsLoader } from '../hooks/useQuotationsLoader'
import { selectQuotationsPage, selectQuotationsStatus } from '../selectors/quotations.selectors'
import { setQuotationsPage } from '../slices/quotations.slice'

export const QuotationsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  useQuotationsLoader()
  const { meta } = useAppSelector(selectQuotationsPage)
  const status = useAppSelector(selectQuotationsStatus)

  return (
    <div className="quotations-screen inv-screen">
      <div className="data-card">
        <QuotationsToolbar />
        <QuotationsTable />
      </div>
      <Pagination
        meta={meta}
        disabled={status === 'loading'}
        label="Paginación de cotizaciones"
        onPageChange={(page) => dispatch(setQuotationsPage(page))}
      />
    </div>
  )
}

export default QuotationsScreen
