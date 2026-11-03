// audit.slice.test · pruebas del estado de la auditoría: filtros y página, carga con requestId y descarte de respuestas viejas
// conecta con: audit.slice y audit.thunks (solo sus tipos de acción) y audit.selectors; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_AUDIT_STATE } from '../constants/audit.constants'
import { selectAuditEntries } from '../selectors/audit.selectors'
import { loadAuditThunk } from '../thunks/audit.thunks'
import { auditReducer, setAuditFilters, setAuditPage } from './audit.slice'
import type { AuditEntry } from '../types/audit.types'

const meta = { currentPage: 1, pageSize: 30, totalRecords: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const entry = (id: number, entityId?: number): AuditEntry => ({
  id,
  actorLabel: 'Administrador · Ana',
  entity: 'products',
  entityLabel: 'Productos',
  entityId,
  action: 'update',
  actionLabel: 'Edición',
  changes: [],
  rawChanges: '{}',
  ipAddress: '',
  userAgent: '',
  createdAt: '2026-10-31T10:00:00Z',
})

describe('audit.slice', () => {
  it('cambiar los filtros vuelve a la página 1', () => {
    let state = auditReducer(INITIAL_AUDIT_STATE, setAuditPage(4))
    expect(state.page).toBe(4)
    state = auditReducer(state, setAuditFilters({ entity: 'customers', action: '' }))
    expect(state).toMatchObject({ page: 1, filters: { entity: 'customers' } })
  })

  it('la página nunca baja de 1', () => {
    expect(auditReducer(INITIAL_AUDIT_STATE, setAuditPage(-3)).page).toBe(1)
  })

  it('guarda la lista que llegó y su meta', () => {
    let state = auditReducer(INITIAL_AUDIT_STATE, loadAuditThunk.pending('r1'))
    expect(state.list.status).toBe('loading')
    state = auditReducer(state, loadAuditThunk.fulfilled({ items: [entry(1), entry(2)], meta }, 'r1'))
    expect(state.list).toMatchObject({ status: 'succeeded', meta })
    expect(state.list.items).toHaveLength(2)
  })

  it('descarta la respuesta de un pedido anterior', () => {
    let state = auditReducer(INITIAL_AUDIT_STATE, loadAuditThunk.pending('viejo'))
    state = auditReducer(state, loadAuditThunk.pending('nuevo'))
    state = auditReducer(state, loadAuditThunk.fulfilled({ items: [entry(9)], meta }, 'viejo'))
    expect(state.list.items).toEqual([])
    expect(state.list.status).toBe('loading')
  })

  it('si falla vacía la lista y guarda el mensaje', () => {
    let state = auditReducer(INITIAL_AUDIT_STATE, loadAuditThunk.pending('r'))
    state = auditReducer(state, loadAuditThunk.rejected(null, 'r', undefined, 'No se pudo cargar la auditoría.'))
    expect(state.list).toMatchObject({ status: 'failed', items: [], error: 'No se pudo cargar la auditoría.' })
  })

  it('con «Ver historial» de un registro solo se ven sus movimientos', () => {
    let state = auditReducer(INITIAL_AUDIT_STATE, loadAuditThunk.pending('r'))
    state = auditReducer(state, loadAuditThunk.fulfilled({ items: [entry(1, 10), entry(2, 11), entry(3, 10)], meta }, 'r'))
    expect(selectAuditEntries({ audit: state })).toHaveLength(3)
    state = auditReducer(state, setAuditFilters({ entity: 'products', action: '', entityId: 10 }))
    expect(selectAuditEntries({ audit: state }).map((e) => e.id)).toEqual([1, 3])
  })
})
