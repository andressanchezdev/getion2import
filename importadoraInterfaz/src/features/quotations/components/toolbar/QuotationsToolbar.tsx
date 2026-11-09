// QuotationsToolbar · barra de la tabla de cotizaciones: búsqueda (40%) y rango de fechas en línea
// conecta con: quotations.slice (filtros), quotations.selectors, global SearchBar
// ojo: sigue estrictamente la línea de diseño canónica basada en ProductsScreen
import React from 'react'
import './QuotationsToolbar.css'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectHasQuotationFilters, selectQuotationFilters } from '../../selectors/quotations.selectors'
import { resetQuotationFilters, setQuotationFilters } from '../../slices/quotations.slice'

export const QuotationsToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectQuotationFilters)
  const hasFilters = useAppSelector(selectHasQuotationFilters)

  return (
    <div className="data-toolbar quotations-toolbar">
      <SearchBar
        value={filters.search}
        onChange={(search) => dispatch(setQuotationFilters({ search }))}
        hasActiveFilters={hasFilters}
        onClear={() => dispatch(resetQuotationFilters())}
        placeholder="Buscar por código, cliente, WhatsApp o quién la hizo..."
        className="quotations-toolbar-search"
      />

      <div className="quotations-toolbar-middle">
        <label className="quotations-toolbar-date">
          <span>Desde:</span>
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => dispatch(setQuotationFilters({ from: e.target.value }))}
          />
        </label>
        <label className="quotations-toolbar-date">
          <span>Hasta:</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => dispatch(setQuotationFilters({ to: e.target.value }))}
          />
        </label>
      </div>

    </div>
  )
}

export default QuotationsToolbar
