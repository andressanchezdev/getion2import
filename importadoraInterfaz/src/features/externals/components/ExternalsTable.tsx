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
import { EXTERNAL_STATUS_OPTIONS, labelsOf } from '../constants/externals.constants'
import { useExternalActions } from '../hooks/useExternalActions'
import { useExternals } from '../hooks/useExternals'
import type { ExternalEntity, ExternalKind, ExternalStatusFilter } from '../types/externals.types'

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
      <div className="externals-card">
        <div className="externals-toolbar">
          <SearchBar value={list.search} onChange={list.setSearch} hasActiveFilters={list.hasFilters} onClear={list.clearFilters} placeholder={labels.searchHint} className="externals-search" />
          <FilterSelect label="Estado" emptyValue="all" value={list.status} options={EXTERNAL_STATUS_OPTIONS} onChange={(value) => list.setStatus((value || 'all') as ExternalStatusFilter)} />
          <button type="button" className="btn-primary externals-create" onClick={() => openForm()}>
            + Registrar {labels.singular.toLowerCase()}
          </button>
        </div>

        <div className="externals-table-responsive table-scroll">
          <table className="externals-table">
            <thead>
              <tr>
                <th>Razón social</th>
                <th>Identificación</th>
                <th>Contacto</th>
                <th>Teléfono y correo</th>
                <th>{isSupplier ? 'Ciudad y dirección' : 'Ciudad y cobertura'}</th>
                {isSupplier && <th>Plazo y cupo</th>}
                <th>Estado</th>
                <th>Acciones</th>
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
                    <td>
                      <div className="externals-cell">
                        <strong>{item.name}</strong>
                        {item.category && <small>{item.category}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="externals-cell">
                        <span>{item.document || '—'}</span>
                        <small>{item.documentType}</small>
                      </div>
                    </td>
                    <td>
                      <div className="externals-cell">
                        <span>{item.contactName || '—'}</span>
                        {item.contactPhone && <small>{item.contactPhone}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="externals-cell">
                        <span>{item.phone || '—'}</span>
                        {item.email && <small>{item.email}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="externals-cell">
                        <strong>{item.city || '—'}</strong>
                        <small>{isSupplier ? item.address : item.coverage || 'Nacional'}</small>
                      </div>
                    </td>
                    {isSupplier && (
                      <td>
                        <div className="externals-cell">
                          <span>{item.termsDays ? `${item.termsDays} días` : 'Contado'}</span>
                          <small className="table-amount">{formatCOP(item.creditLimit || 0)}</small>
                        </div>
                      </td>
                    )}
                    <td>
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
                    <td>
                      <RowActions
                        actions={[
                          { key: 'edit', label: `Editar ${labels.article}`, icon: editIcon, onClick: () => openForm(item) },
                          { key: 'delete', label: `Eliminar ${labels.article}`, icon: trashIcon, tone: 'danger', onClick: () => setToDelete(item) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
