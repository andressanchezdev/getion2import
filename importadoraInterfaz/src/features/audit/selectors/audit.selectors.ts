// audit.selectors · lecturas del estado de la auditoría
// conecta con: audit.slice (estado) y useAuditLog; los movimientos se filtran por registro porque la API no lo filtra
import { createSelector } from '@reduxjs/toolkit'
import type { AuditState } from '../types/audit.types'

type AuditRootState = { audit: AuditState }

export const selectAudit = (state: AuditRootState) => state.audit

// los movimientos de la página cargada; si se llegó con «Ver historial» de un registro, solo los de ese registro
export const selectAuditEntries = createSelector([selectAudit], ({ list, filters }) => list.items.filter((entry) => !filters.entityId || entry.entityId === filters.entityId))
