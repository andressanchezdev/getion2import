// QuotationsScreen · Tienda > Cotizaciones: búsqueda (40%), filtro por fechas, botón + Crear cotización con drawer lateral derecho
// conecta con: useQuotationsLoader (las pide), QuotationsToolbar, QuotationsTable, CreateQuotationDrawer y global Pagination; la monta MainContent (screenRegistry)
import React, { useState } from 'react'
import './QuotationsScreen.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { QuotationsTable } from '../components/table/QuotationsTable'
import { QuotationsToolbar } from '../components/toolbar/QuotationsToolbar'
import { CreateQuotationDrawer } from '../components/CreateQuotationDrawer'
import { useQuotationsLoader } from '../hooks/useQuotationsLoader'
import { selectQuotationsPage, selectQuotationsStatus } from '../selectors/quotations.selectors'
import { setQuotationsPage } from '../slices/quotations.slice'

export const QuotationsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  useQuotationsLoader()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { meta } = useAppSelector(selectQuotationsPage)
  const status = useAppSelector(selectQuotationsStatus)

  return (
    <div className="quotations-screen inv-screen">
      <div className="quotations-screen-card inv-card">
        <QuotationsToolbar onCreateQuotation={() => setIsCreateOpen(true)} />
        <QuotationsTable />
      </div>
      <Pagination
        meta={meta}
        disabled={status === 'loading'}
        label="Paginación de cotizaciones"
        onPageChange={(page) => dispatch(setQuotationsPage(page))}
      />
      <CreateQuotationDrawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}

export default QuotationsScreen
