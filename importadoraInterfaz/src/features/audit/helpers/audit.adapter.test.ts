// audit.adapter.test · pruebas de la conversión de movimientos de auditoría y de las distintas formas de «changes»
// conecta con: audit.adapter; se corre con npm test
import { describe, expect, it } from 'vitest'
import { humanizeAction, toAuditEntry, toChangeRows } from './audit.adapter'

describe('toChangeRows', () => {
  it('sin cambios no hay filas', () => {
    expect(toChangeRows(null)).toEqual([])
    expect(toChangeRows(undefined)).toEqual([])
  })

  it('{ campo: { before, after } } (también old/new y from/to)', () => {
    expect(toChangeRows({ price: { before: 10, after: 12 }, name: { old: 'A', new: 'B' }, qty: { from: 1, to: 2 } })).toEqual([
      { field: 'price', before: '10', after: '12' },
      { field: 'name', before: 'A', after: 'B' },
      { field: 'qty', before: '1', after: '2' },
    ])
  })

  it('{ before: {...}, after: {...} } se une por campo', () => {
    expect(toChangeRows({ before: { status: 'pending' }, after: { status: 'in_transit', note: 'x' } })).toEqual([
      { field: 'status', before: 'pending', after: 'in_transit' },
      { field: 'note', before: '', after: 'x' },
    ])
  })

  it('un objeto plano deja solo el valor nuevo y lo anidado va como texto', () => {
    expect(toChangeRows({ quantity: 4, items: [1, 2] })).toEqual([
      { field: 'quantity', before: '', after: '4' },
      { field: 'items', before: '', after: '[1,2]' },
    ])
  })

  it('un valor suelto queda en una sola fila', () => {
    expect(toChangeRows('anulado')).toEqual([{ field: 'valor', before: '', after: 'anulado' }])
  })
})

describe('toAuditEntry', () => {
  it('arma etiquetas en español y conserva el registro original', () => {
    const entry = toAuditEntry({
      id: 9, companyId: 3, actorType: 'admin', actorName: 'Ana', entity: 'transfers', entityId: 11, action: 'TRANSFER_CREATED',
      changes: { status: 'pending' }, ipAddress: '1.1.1.1', userAgent: 'Chrome', createdAt: '2026-10-30T10:00:00Z',
    })
    expect(entry).toMatchObject({
      id: 9, companyId: 3, actorLabel: 'Administrador · Ana', entityLabel: 'Traslados', entityId: 11, actionLabel: 'Transfer created', ipAddress: '1.1.1.1',
    })
    expect(entry.rawChanges).toBe(JSON.stringify({ status: 'pending' }, null, 2))
  })

  it('una gestión sin etiqueta usa su clave y sin actor queda «Sistema»', () => {
    expect(toAuditEntry({ id: 1, entity: 'cosa_nueva', action: 'X', createdAt: '' })).toMatchObject({ entityLabel: 'cosa_nueva', actorLabel: 'Sistema', changes: [], rawChanges: '' })
  })
})

describe('humanizeAction', () => {
  it('pasa de MAYÚSCULAS_CON_GUION a texto', () => {
    expect(humanizeAction('STOCK_ADJUSTED')).toBe('Stock adjusted')
  })
})
