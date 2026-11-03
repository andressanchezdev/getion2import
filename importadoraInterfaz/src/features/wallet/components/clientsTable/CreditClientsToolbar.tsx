// CreditClientsToolbar · barra de la tabla de clientes: búsqueda, un solo desplegable de estado de crédito y Habilitar crédito (el limpiar va dentro de la búsqueda)
// conecta con: wallet.slice (filtros), wallet.constants (opciones de estado), global SearchBar, FilterSelect, openDrawerForm; la pinta CreditClientsTable
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { openDrawerForm } from '@/features/navigation'
import { CREDIT_STATUS_TABS } from '../../constants/wallet.constants'
import { resetFilters, setSearchQuery, setStatusFilter } from '../../slices/wallet.slice'
import type { CreditStatus } from '../../types/wallet.types'
import './CreditClientsToolbar.css'

const STATUS_OPTIONS = CREDIT_STATUS_TABS.filter((tab) => tab.key !== 'all').map((tab) => ({ value: tab.key, label: tab.label }))

export const CreditClientsToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.wallet.filters)
  const hasFilters = filters.searchQuery !== '' || filters.statusFilter !== 'all'

  return (
    <div className="credit-table-toolbar">
      <SearchBar
        value={filters.searchQuery}
        onChange={(val) => dispatch(setSearchQuery(val))}
        hasActiveFilters={hasFilters}
        onClear={() => dispatch(resetFilters())}
        placeholder="Buscar por NIT, razón social, contacto o ciudad..."
        className="credit-table-search-bar"
      />

      <FilterSelect
        label="Filtrar por estado"
        emptyValue="all"
        value={filters.statusFilter}
        options={STATUS_OPTIONS}
        onChange={(value) => dispatch(setStatusFilter(value as 'all' | CreditStatus))}
      />

      <div className="credit-table-toolbar-actions">
        <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'enableCredit' }))}>
          + Habilitar crédito
        </button>
      </div>
    </div>
  )
}

export default CreditClientsToolbar
