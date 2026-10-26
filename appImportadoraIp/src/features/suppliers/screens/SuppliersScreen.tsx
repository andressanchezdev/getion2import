// SuppliersScreen · pantalla de Gestión Roles > Proveedores: totales, búsqueda en el servidor, tabla y paginador
// conecta con: suppliers.selectors/slice (lista, búsqueda y totales), useSuppliersLoader (los pide), global SearchBar, StatCard y Pagination; la monta MainContent (screenRegistry)
// ojo: carga, error y lista vacía se muestran dentro de la tabla; los totales fallan por separado y muestran "No disponible"
import React from 'react'
import './SuppliersScreen.css'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { StatCard } from '@/global/components/UI/molecules/StatCard'
import { useSuppliersLoader } from '../hooks/useSuppliersLoader'
import { selectSuppliers } from '../selectors/suppliers.selectors'
import { setSuppliersPage, setSuppliersQuery } from '../slices/suppliers.slice'
import { loadSuppliersThunk } from '../thunks/suppliers.thunks'

const COLUMNS = 6

export const SuppliersScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, meta, query, summary } = useAppSelector(selectSuppliers)
  useSuppliersLoader()

  const n = (value: number | undefined) => (summary.status === 'failed' ? 'No disponible' : String(value ?? '…'))
  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando proveedores…'
    if (items.length === 0) return query.trim() ? 'Ningún proveedor coincide con la búsqueda.' : 'No hay proveedores registrados.'
    return null
  })()

  return (
    <div className="suppliers-screen">
      <div className="suppliers-kpis">
        <StatCard title="Proveedores" value={n(summary.data?.total)} subtitle={`Activos: ${summary.data?.active ?? '…'}`} />
        <StatCard title="Productos de proveedores" value={n(summary.data?.products)} />
        <StatCard title="Cupo de crédito total" value={summary.status === 'failed' ? 'No disponible' : formatCOP(summary.data?.totalCreditLimit ?? 0)} />
      </div>

      <div className="data-table-card">
        <div className="suppliers-toolbar">
          <SearchBar value={query} onChange={(value) => dispatch(setSuppliersQuery(value))} placeholder="Buscar por nombre, documento o contacto..." className="suppliers-search" />
        </div>
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Ciudad</th>
                <th className="data-table-number">Plazo / Cupo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={status === 'failed'} onRetry={status === 'failed' ? () => dispatch(loadSuppliersThunk()) : undefined} />
              ) : (
                items.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="data-table-strong">{supplier.name}</td>
                    <td>{supplier.document || '—'}</td>
                    <td>
                      {supplier.contactName || '—'}
                      <div className="data-table-sub">{[supplier.contactPhone, supplier.contactEmail].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{supplier.city || '—'}</td>
                    <td className="data-table-number">
                      {supplier.paymentTerms} días
                      <div className="data-table-sub">{formatCOP(supplier.creditLimit)}</div>
                    </td>
                    <td>
                      <span className={`suppliers-status ${supplier.isActive ? 'suppliers-status-active' : ''}`}>{supplier.isActive ? 'Activo' : 'Inactivo'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación de proveedores" onPageChange={(next) => dispatch(setSuppliersPage(next))} />}
    </div>
  )
}

export default SuppliersScreen
