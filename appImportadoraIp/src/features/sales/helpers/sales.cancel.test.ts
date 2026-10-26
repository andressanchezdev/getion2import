// sales.cancel.test · pruebas de cuándo se ofrece anular una venta
// conecta con: sales.cancel; se corre con npm test
import { describe, expect, it } from 'vitest'
import { canCancelSale, MIN_CANCEL_REASON } from './sales.cancel'

describe('canCancelSale', () => {
  it('se ofrece en las etapas abiertas', () => {
    for (const status of ['verification', 'picking', 'dispatch', 'facturar', 'Verification', '']) expect(canCancelSale(status)).toBe(true)
  })

  it('no se ofrece en ventas ya anuladas o completadas', () => {
    expect(canCancelSale('cancelled')).toBe(false)
    expect(canCancelSale(' Completed ')).toBe(false)
  })

  it('el motivo mínimo es de 5 letras', () => {
    expect(MIN_CANCEL_REASON).toBe(5)
  })
})
