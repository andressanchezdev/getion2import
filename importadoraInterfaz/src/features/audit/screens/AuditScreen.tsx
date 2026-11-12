// AuditScreen · auditoría de movimientos: filtros rápidos por rol, tipo de acción, gestión y rango de fechas (Desde / Hasta)
// conecta con: useAuditLog (datos), AuditTable, audit.constants (gestiones, acciones y roles), AuditDetailPanel (vía formRegistry) y global Pagination; la monta MainContent (screenRegistry)
import React from 'react'
import './AuditScreen.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITIES,
  AUDIT_ROLE_OPTIONS,
  EMPTY_AUDIT_FILTERS,
} from '../constants/audit.constants'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { AuditTable } from '../components/AuditTable'
import { useAuditLog } from '../hooks/useAuditLog'

export const AuditScreen: React.FC = () => {
  const { entries, meta, loading, error, filters, changeFilters, setPage } = useAuditLog()
  const dispatch = useAppDispatch()

  const hasActiveFilters = Boolean(
    filters.entity ||
    filters.action ||
    filters.role ||
    filters.from ||
    filters.to ||
    filters.entityId
  )

  const handleClearFilters = () => {
    changeFilters(EMPTY_AUDIT_FILTERS)
  }

  return (
    <div className="audit-screen">
      <div className="data-card">
        <div className="data-toolbar audit-toolbar">
          <div className="audit-toolbar-filters">
            <FilterSelect
              label="Rol"
              allLabel="Todos los roles"
              value={filters.role || ''}
              options={AUDIT_ROLE_OPTIONS}
              onChange={(val) => changeFilters({ ...filters, role: val })}
            />

            <FilterSelect
              label="Tipo de Acción"
              allLabel="Todas las acciones"
              value={filters.action || ''}
              options={AUDIT_ACTION_OPTIONS}
              onChange={(val) => changeFilters({ ...filters, action: val })}
            />

            <FilterSelect
              label="Gestión"
              allLabel="Todas las gestiones"
              value={filters.entity}
              options={Object.entries(AUDIT_ENTITIES).map(([key, label]) => ({ value: key, label }))}
              onChange={(val) => changeFilters({ ...filters, entity: val, entityId: undefined })}
            />

            {/* Rango de Fechas: Desde */}
            <label className="audit-filter">
              <span>Desde:</span>
              <input
                type="date"
                className="audit-date"
                value={filters.from || ''}
                max={filters.to || undefined}
                onChange={(e) => changeFilters({ ...filters, from: e.target.value })}
              />
            </label>

            {/* Rango de Fechas: Hasta */}
            <label className="audit-filter">
              <span>Hasta:</span>
              <input
                type="date"
                className="audit-date"
                value={filters.to || ''}
                min={filters.from || undefined}
                onChange={(e) => changeFilters({ ...filters, to: e.target.value })}
              />
            </label>
          </div>

          <div className="audit-toolbar-actions">
            {filters.entityId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => changeFilters({ ...filters, entityId: undefined })}
                title="Quitar filtro de registro específico"
              >
                Registro #{filters.entityId} ✕
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearFilters}
              >
                Limpiar filtros
              </button>
            )}

            {meta && (
              <span className="audit-count">
                {meta.totalRecords} {meta.totalRecords === 1 ? 'movimiento' : 'movimientos'}
              </span>
            )}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="audit-empty">Cargando movimientos...</div>
          ) : error ? (
            <div className="audit-empty">{error}</div>
          ) : entries.length === 0 ? (
            <div className="audit-empty">No hay movimientos registrados con estos filtros.</div>
          ) : (
            <AuditTable
              entries={entries}
              onOpen={(entry) => dispatch(openDrawerForm({ kind: 'auditDetail', payload: entry }))}
            />
          )}
        </div>
      </div>

      {meta && (
        <Pagination
          meta={meta}
          disabled={loading}
          onPageChange={setPage}
          label="Paginación de auditoría"
        />
      )}
    </div>
  )
}

export default AuditScreen
