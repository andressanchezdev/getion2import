// ExternalsTable · una sola tarjeta con búsqueda, filtro de estado, botón de registrar y la tabla de proveedores o transportadoras
// conecta con: SuppliersScreen y CarriersScreen (la usan), useExternals y useExternalActions, RowActions (editar y borrar con íconos), ConfirmDialog (borrar), Pagination y navigation (abre el panel «externalForm»)
// ojo: el estado se cambia desde la misma columna con un desplegable; la lista completa llega del backend y aquí se pagina de 20 en 20
import React, { useState } from 'react'
import './ExternalsTable.css'
import '@/features/inventory/components/InventoryTables.css'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import editIcon from '@/assets/icons/edit.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import listIcon from '@/assets/icons/list.svg?raw'
import { EXTERNAL_STATUS_OPTIONS, labelsOf } from '../constants/externals.constants'
import { useExternalActions } from '../hooks/useExternalActions'
import { useExternals } from '../hooks/useExternals'
import type { ExternalEntity, ExternalKind, ExternalStatusFilter } from '../types/externals.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

export const ExternalsTable: React.FC<{ kind: ExternalKind }> = ({ kind }) => {
  const dispatch = useAppDispatch()
  const labels = labelsOf(kind)
  const isSupplier = kind !== 'carrier'
  const list = useExternals(kind)
  const actions = useExternalActions()
  const [toDelete, setToDelete] = useState<ExternalEntity | null>(null)
  const { pageItems, meta, setPage } = usePagedList(list.items, `${list.search}|${list.status}|${kind}`)
  const columns = isSupplier ? 8 : 7

  const message = list.failed
    ? list.error
    : list.loading
    ? 'Cargando…'
    : list.items.length === 0
    ? list.hasFilters
      ? `No hay ${labels.plural} con estos filtros.`
      : `Todavía no hay ${labels.plural} registrados.`
    : null

  const openForm = (item?: ExternalEntity) => dispatch(openDrawerForm({ kind: 'externalForm', payload: { kind, item } }))

  const confirmDelete = async (reason: string) => {
    const target = toDelete
    setToDelete(null)
    if (target) await actions.remove(target, reason)
  }

  return (
    <div className="externals-screen">
      <div className="data-card">
        <div className="data-toolbar externals-toolbar">
          <SearchBar value={list.search} onChange={list.setSearch} hasActiveFilters={list.hasFilters} onClear={list.clearFilters} placeholder={labels.searchHint} className="externals-search" />
          <FilterSelect label="Estado" emptyValue="all" value={list.status} options={EXTERNAL_STATUS_OPTIONS} onChange={(value) => list.setStatus((value || 'all') as ExternalStatusFilter)} />
          <button type="button" className="btn-primary externals-create" onClick={() => openForm()}>
            <Icon svg={plusIcon} /> Registrar {labels.singular.toLowerCase()}
          </button>
        </div>

        <DataTable tableId="externals-externals">
            <thead>
              <tr>
                <th className="col-priority-high">Razón social</th>
                <th className="col-priority-medium">Identificación</th>
                <th className="col-priority-low">Contacto</th>
                <th className="col-priority-medium">Teléfono y correo</th>
                <th className="col-priority-low">{isSupplier ? 'Ciudad y dirección' : 'Ciudad y cobertura'}</th>
                {isSupplier && <th className="col-priority-medium">Plazo y cupo</th>}
                <th className="col-priority-high">Estado</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <tr>
                  <td colSpan={columns} className="externals-empty-td">{message}</td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id}>
                  <td className="col-priority-high">
                    <div className="externals-cell">
                      <strong>{item.name}</strong>
                      {item.category && <small>{item.category}</small>}
                    </div>
                  </td>
                  <td className="col-priority-medium">
                    <div className="externals-cell">
                      <span>{item.document || '—'}</span>
                      <small>{item.documentType}</small>
                    </div>
                  </td>
                  <td className="col-priority-low">
                    <div className="externals-cell">
                      <span>{item.contactName || '—'}</span>
                      {item.contactPhone && <small>{item.contactPhone}</small>}
                    </div>
                  </td>
                  <td className="col-priority-medium">
                    <div className="externals-cell">
                      <span>{item.phone || '—'}</span>
                      {item.email && <small>{item.email}</small>}
                    </div>
                  </td>
                  <td className="col-priority-low">
                    <div className="externals-cell">
                      <strong>{item.city || '—'}</strong>
                      <small>{isSupplier ? item.address : item.coverage || 'Nacional'}</small>
                    </div>
                  </td>
                  {isSupplier && (
                    <td className="col-priority-medium">
                      <div className="externals-cell">
                        <span>{item.termsDays ? `${item.termsDays} días` : 'Contado'}</span>
                        <small className="table-amount">{formatCOP(item.creditLimit || 0)}</small>
                      </div>
                    </td>
                  )}
                  <td className="col-priority-high">
                    <select
                      className={`inv-status-select is-${item.isActive ? 'active' : 'inactive'}`}
                      value={item.isActive ? 'active' : 'inactive'}
                      disabled={actions.saving}
                      aria-label={`Estado de ${item.name}`}
                      title="Cambiar estado"
                      onChange={(event) => actions.setActive(item, event.target.value === 'active')}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                  <td className="col-actions">
                    <RowActions
                        actions={[
                          { key: 'catalog', label: `Catálogo de productos de ${item.name}`, icon: listIcon, visible: isSupplier, onClick: () => dispatch(openDrawerForm({ kind: 'supplierCatalog', payload: { id: item.id, name: item.name } })) },
                          { key: 'edit', label: `Editar ${labels.article}`, icon: editIcon, onClick: () => openForm(item) },
                          { key: 'delete', label: `Eliminar ${labels.article}`, icon: trashIcon, tone: 'danger', onClick: () => setToDelete(item) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        <Pagination meta={meta} label={`Paginación de ${labels.plural}`} onPageChange={setPage} />
      </div>

      <ReasonPrompt
        open={toDelete !== null}
        title={`Eliminar ${labels.singular.toLowerCase()}`}
        message={`¿Eliminar ${labels.article} «${toDelete?.name ?? ''}»? Indica el motivo para dejar constancia.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

export default ExternalsTable
