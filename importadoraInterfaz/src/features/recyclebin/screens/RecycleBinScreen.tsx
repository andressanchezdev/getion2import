// RecycleBinScreen.tsx · pantalla de Papelera de Reciclaje y Restauración de Registros
import React from 'react'
import './RecycleBinScreen.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { formatDate } from '@/global/helpers/formatting/format'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import refreshIcon from '@/assets/icons/refresh.svg?raw'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { useRecycleBin } from '../hooks/useRecycleBin'

const TABLE_LABELS: Record<string, string> = {
  customers: 'Clientes',
  products: 'Productos',
  employees: 'Empleados',
  suppliers: 'Proveedores',
  warehouses: 'Bodegas',
  roles: 'Roles',
}

export const RecycleBinScreen: React.FC = () => {
  const {
    items,
    meta,
    setPage,
    search,
    setSearch,
    tableFilter,
    setTableFilter,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    restoringId,
    loadItems,
    handleRestore,
  } = useRecycleBin()

  return (
    <div className="recycle-bin-screen">
      <div className="recycle-bin-card">
        <div className="recycle-bin-toolbar">
          <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar en papelera por nombre o etiqueta..."
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--bg-main)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">Todas las entidades</option>
              <option value="customers">Clientes</option>
              <option value="products">Productos</option>
              <option value="employees">Empleados</option>
              <option value="suppliers">Proveedores</option>
              <option value="warehouses">Bodegas</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'restored' | 'all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--bg-main)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="pending">Sin restaurar</option>
              <option value="restored">Restaurados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        <div className="recycle-table-responsive table-scroll">
          <table className="recycle-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Elemento / Etiqueta</th>
                <th>Eliminado Por</th>
                <th>Fecha de Eliminación</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="recycle-table-empty">
                    Cargando elementos de la papelera…
                  </td>
                </tr>
              ) : error && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="recycle-table-empty">
                    <p style={{ color: 'var(--c-red-600)' }}>{error}</p>
                    <button type="button" className="btn-secondary" style={{ marginTop: '8px' }} onClick={loadItems}>
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="recycle-table-empty">
                    No hay elementos en la papelera de reciclaje para este filtro.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-badge-bg is-pill">
                        {TABLE_LABELS[item.entityTable] || item.entityTable}
                      </span>
                    </td>
                    <td>
                      <strong>{item.entityLabel || `#${item.entityId}`}</strong>
                    </td>
                    <td>{item.deletedByActorName || item.deletedByActorType || '—'}</td>
                    <td>{formatDate(item.deletedAt)}</td>
                    <td>
                      <Pill tone={item.isRestored ? 'green' : 'amber'}>
                        {item.isRestored ? 'Restaurado' : 'En papelera'}
                      </Pill>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!item.isRestored && (
                        <RowActions
                          actions={[
                            {
                              key: 'restore',
                              label: restoringId === item.id ? 'Restaurando…' : 'Restaurar registro',
                              icon: refreshIcon,
                              onClick: () => handleRestore(item),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta && (
        <Pagination
          meta={meta}
          disabled={loading}
          label="Paginación de papelera"
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

export default RecycleBinScreen

