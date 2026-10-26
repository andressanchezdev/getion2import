// CreditClientsTable · tabla de clientes: barra de filtros, encabezado y una fila por cliente
// conecta con: wallet.slice, wallet.selectors, wallet.thunks (reintentar), global Pagination; las partes son CreditClientsToolbar y CreditClientRow; al hacer clic abre CreditAccountDrawer
import React from 'react'
import './CreditClientsTable.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
// ojo: el filtrado ahora sale de wallet.selectors y la fila vive en CreditClientRow (antes estaba todo aquí dentro)
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import {
  selectFilteredCustomers,
  selectWalletListError,
  selectWalletListStatus,
  selectWalletMeta,
} from '../../selectors/wallet.selectors'
import { resetFilters, setWalletPage } from '../../slices/wallet.slice'
import { loadWalletThunk } from '../../thunks/wallet.thunks'
import { CreditClientsToolbar } from './CreditClientsToolbar'
import { CreditClientRow } from '../clientRow/CreditClientRow'
import { WalletKpiHeader } from '../kpis/WalletKpiHeader'

export const CreditClientsTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const selectedCustomerId = useAppSelector((state) => state.wallet.selectedCustomer?.id)
  const status = useAppSelector(selectWalletListStatus)
  const error = useAppSelector(selectWalletListError)
  const meta = useAppSelector(selectWalletMeta)

  // Filtrado reactivo de clientes
  const filteredCustomers = useAppSelector(selectFilteredCustomers)

  return (
    <div className="credit-table-clients-card">
      {/* 1. Métricas KPI en una sola línea integrada en la tarjeta */}
      <div className="credit-table-kpis-wrapper">
        <WalletKpiHeader />
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <CreditClientsToolbar />

      {/* Tabla de Clientes */}
      <div className="credit-table-responsive">
        <table className="credit-table">
          <thead>
            <tr>
              <th>Cliente / Documento</th>
              <th>Plazo / Reservado</th>
              <th>Cupo Total</th>
              <th>Saldo Adeudado</th>
              <th>Disponible</th>
              <th>Estado</th>
              <th className="credit-table-align-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {status === 'failed' ? (
              <tr>
                <td colSpan={7} className="credit-table-empty-td">
                  <p className="credit-table-empty-text">{error}</p>
                  <button type="button" onClick={() => dispatch(loadWalletThunk())} className="credit-table-reset-link">
                    Reintentar
                  </button>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 && (status === 'idle' || status === 'loading') ? (
              <tr>
                <td colSpan={7} className="credit-table-empty-td">
                  <p className="credit-table-empty-text">Cargando cartera…</p>
                </td>
              </tr>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => (
                <CreditClientRow key={cust.id} customer={cust} isSelected={selectedCustomerId === cust.id} />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="credit-table-empty-td">
                  <div className="credit-table-empty-content">
                    <p className="credit-table-empty-text">No se encontraron clientes con los filtros seleccionados.</p>
                    <button
                      type="button"
                      onClick={() => dispatch(resetFilters())}
                      className="credit-table-reset-link"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador de la lista (la lista viene paginada del backend) */}
      {meta && (
        <Pagination
          meta={meta}
          disabled={status === 'loading'}
          label="Paginación de cartera"
          onPageChange={(page) => dispatch(setWalletPage(page))}
        />
      )}
    </div>
  )
}

export default CreditClientsTable
