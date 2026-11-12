// RecycleBinScreen.tsx · pantalla de Papelera de Reciclaje y Restauración de Registros
import React, { useState } from 'react'
import './RecycleBinScreen.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { formatDate } from '@/global/helpers/formatting/format'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import historyIcon from '@/assets/icons/history.svg?raw'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { useRecycleBin } from '../hooks/useRecycleBin'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { ActionsHeader } from '@/global/components/UI/molecules/table/ActionsHeader'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'

const TABLE_LABELS: Record<string, string> = {
  customers: 'Clientes',
  products: 'Productos',
  employees: 'Empleados',
  suppliers: 'Proveedores',
  warehouses: 'Bodegas',
  roles: 'Roles',
  companies: 'Compañías',
  admins: 'Administradores',
  brands: 'Marcas',
  vehicle_brands: 'Marcas de vehículos',
  models: 'Modelos',
  vehicle_models: 'Modelos de vehículos',
  categories: 'Categorías',
  warehouse_locations: 'Ubicaciones de bodega',
  externals: 'Proveedores y transportadores',
}

export const RecycleBinScreen: React.FC = () => {
  // la API solo deja restaurar al superadmin: a los demás ni se les ofrece el botón
  const canRestore = usePermissions().level === 'superadmin'
  // restaurar pide el motivo (se abre el formulario en el panel derecho)
  const [toRestore, setToRestore] = useState<{ id: number; label: string } | null>(null)
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
      <div className="data-card">
        <div className="data-toolbar">
          <div className="recycle-toolbar-search">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar en papelera por nombre o etiqueta..."
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button type="button" className="btn-secondary" onClick={() => setStatusFilter(statusFilter === 'restored' ? 'all' : 'restored')}>
              {statusFilter === 'restored' ? 'Volver a la papelera' : 'Ver historial de restauraciones'}
            </button>
            <FilterSelect
              label="Entidad"
              allLabel="Todas las entidades"
              value={tableFilter}
              options={Object.entries(TABLE_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={setTableFilter}
            />

            <FilterSelect
              label="Estado"
              allLabel="Todos"
              emptyValue="all"
              value={statusFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Sin restaurar' },
                { value: 'restored', label: 'Restaurados' },
              ]}
              onChange={(val) => setStatusFilter(val as 'pending' | 'restored' | 'all')}
            />
          </div>
        </div>

        <DataTable tableId="recyclebin-recycle-bin" className="recycle-table">
          <thead>
            <tr>
              <th>Entidad</th>
              <th>Elemento / Etiqueta</th>
              <th>Eliminado Por</th>
              <th>Fecha de Eliminación</th>
              <th>Estado</th>
              <ActionsHeader />
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
                    <strong>{item.entityLabel || <CopyableCell text={item.entityId} prefix="#" />}</strong>
                  </td>
                  <td>{item.deletedByActorName || item.deletedByActorType || '—'}</td>
                  <td>{formatDate(item.deletedAt)}</td>
                  <td>
                    <Pill tone={item.isRestored ? 'green' : 'amber'}>
                      {item.isRestored ? 'Restaurado' : 'En papelera'}
                    </Pill>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {!item.isRestored && canRestore && (
                      <RowActions
                        actions={[
                          {
                            key: 'restore',
                            label: restoringId === item.id ? 'Restaurando…' : 'Restaurar registro',
                            icon: historyIcon,
                            onClick: () => setToRestore({ id: item.id, label: item.entityLabel || item.entityTable }),
                          },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </div>

      {meta && (
        <Pagination
          meta={meta}
          disabled={loading}
          label="Paginación de papelera"
          onPageChange={setPage}
        />
      )}

      <ReasonPrompt
        open={toRestore !== null}
        title="Restaurar registro"
        message={`¿Restaurar «${toRestore?.label ?? ''}»? Vuelve a la lista de donde se eliminó; indica el motivo para dejar constancia.`}
        confirmLabel="Restaurar"
        onConfirm={(reason) => {
          const item = items.find((candidate) => candidate.id === toRestore?.id)
          setToRestore(null)
          if (item) void handleRestore(item, reason)
        }}
        onCancel={() => setToRestore(null)}
      />
    </div>
  )
}

export default RecycleBinScreen
