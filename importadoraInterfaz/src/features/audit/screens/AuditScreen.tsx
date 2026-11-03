// AuditScreen · auditoría de solo lectura: todos los movimientos de la compañía (quién, cuándo y qué cambió) con filtros; el detalle completo de cada movimiento se abre en el panel derecho
// conecta con: useAuditLog (datos), AuditTable, AuditDetailModal, audit.constants (gestiones del filtro), AuditDetailPanel (vía formRegistry) y global Pagination; la monta MainContent (screenRegistry)
// ojo: «Ver historial» de otras pantallas llega con la gestión y el registro ya elegidos (el registro se filtra sobre la página cargada, la API solo filtra por gestión y acción)
// ojo: no modifica nada; la ve el admin (su compañía) y el superadmin (la que eligió en el header, o todas)
import React from 'react'
import './AuditScreen.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { AUDIT_ENTITIES } from '../constants/audit.constants'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { AuditTable } from '../components/AuditTable'
import { useAuditLog } from '../hooks/useAuditLog'

export const AuditScreen: React.FC = () => {
  const { entries, meta, loading, error, filters, changeFilters, setPage } = useAuditLog()
  const dispatch = useAppDispatch()

  return (
    <div className="audit-container">
      <div className="audit-toolbar">
        <label className="audit-filter">
          <span>Gestión</span>
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

        <label className="audit-filter">
          <span>Acción</span>
          <input
            className="audit-select"
            type="text"
            maxLength={40}
            placeholder="Ej. TRANSFER_CREATED"
            value={filters.action}
            onChange={(e) => changeFilters({ ...filters, action: e.target.value.trim().toUpperCase() })}
          />
        </label>

        {filters.entityId && (
          <button type="button" className="btn-secondary" onClick={() => changeFilters({ ...filters, entityId: undefined })}>
            Registro #{filters.entityId} ✕
          </button>
        )}
      </div>

      <div className="audit-table-card table-scroll">
        {loading ? (
          <div className="audit-empty">Cargando movimientos...</div>
        ) : error ? (
          <div className="audit-empty">{error}</div>
        ) : entries.length === 0 ? (
          <div className="audit-empty">No hay movimientos registrados con estos filtros.</div>
        ) : (
          <AuditTable entries={entries} onOpen={(entry) => dispatch(openDrawerForm({ kind: 'auditDetail', payload: entry }))} />
        )}
      </div>

      {meta && <Pagination meta={meta} disabled={loading} onPageChange={setPage} label="Paginación de auditoría" />}
    </div>
  )
}

export default AuditScreen
