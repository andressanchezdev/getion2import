// AuditScreen · auditoría de movimientos: filtros rápidos por rol, tipo de acción, gestión y rango de fechas (Desde / Hasta)
// conecta con: useAuditLog (datos), AuditTable, audit.constants (gestiones, acciones y roles), AuditDetailPanel (vía formRegistry) y global Pagination; la monta MainContent (screenRegistry)
import React from 'react'
import './AuditScreen.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
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
            {/* Filtro rápido por Rol */}
            <label className="audit-filter">
              <span>Rol:</span>
              <select
                className="audit-select"
                value={filters.role || ''}
                onChange={(e) => changeFilters({ ...filters, role: e.target.value })}
              >
                {AUDIT_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {/* Filtro rápido por Tipo de Acción */}
            <label className="audit-filter">
              <span>Tipo de Acción:</span>
              <select
                className="audit-select"
                value={filters.action || ''}
                onChange={(e) => changeFilters({ ...filters, action: e.target.value })}
              >
                {AUDIT_ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {/* Filtro por Gestión */}
            <label className="audit-filter">
              <span>Gestión:</span>
              <select
                className="audit-select"
                value={filters.entity}
                onChange={(e) => changeFilters({ ...filters, entity: e.target.value, entityId: undefined })}
              >
                <option value="">Todas las gestiones</option>
                {Object.entries(AUDIT_ENTITIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>

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

        <div className="audit-table-card">
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
