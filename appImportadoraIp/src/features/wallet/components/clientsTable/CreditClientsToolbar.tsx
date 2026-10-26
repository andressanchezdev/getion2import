// CreditClientsToolbar · barra de la tabla de clientes: búsqueda y pestañas de estado de crédito
// conecta con: wallet.slice (filtros), wallet.constants (pestañas), global SearchBar; la pinta CreditClientsTable
import React from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { CREDIT_STATUS_TABS } from '../../constants/wallet.constants'
import { setSearchQuery, setStatusFilter } from '../../slices/wallet.slice'
import './CreditClientsToolbar.css'

export const CreditClientsToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const filters = useAppSelector((state) => state.wallet.filters)

  return (
    /* Barra de Filtros y Búsqueda */
    <div className="credit-table-toolbar">
      <SearchBar
        value={filters.searchQuery}
        onChange={(val) => dispatch(setSearchQuery(val))}
        placeholder="Buscar por NIT, razón social, contacto o ciudad..."
        className="credit-table-search-bar"
      />

      {/* Pestañas de Estado Crediticio */}
      <div className="credit-table-status-tabs">
        {CREDIT_STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => dispatch(setStatusFilter(tab.key))}
            className={`credit-table-tab-btn ${filters.statusFilter === tab.key ? 'credit-table-tab-btn-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CreditClientsToolbar
