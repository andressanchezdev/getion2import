// useColumnAlign.test · pruebas de cómo se decide la alineación de una columna (acciones y estados al centro, valores a la derecha, el resto a la izquierda)
// conecta con: useColumnAlign; se corre con npm test
import { describe, expect, it } from 'vitest'
import { alignOf } from './useColumnAlign'

const header = (text: string): HTMLTableCellElement => {
  const th = document.createElement('th')
  th.textContent = text
  return th
}

const cell = (html: string): HTMLTableCellElement => {
  const td = document.createElement('td')
  td.innerHTML = html
  return td
}

describe('alignOf', () => {
  it('acciones: por el título o porque todas las celdas traen los íconos de acción', () => {
    expect(alignOf(header('Acciones'), [])).toBe('center')
    expect(alignOf(header(''), [cell('<div class="row-actions"></div>'), cell('<span class="row-actions-none">—</span>')])).toBe('center')
  })

  it('estados: por el título o porque cada celda es solo una insignia', () => {
    expect(alignOf(header('Estado'), [])).toBe('center')
    expect(alignOf(header('Pago'), [cell('<span class="ui-pill">Sin pagar</span>')])).toBe('center')
    expect(alignOf(header('Pago'), [cell('<span class="ui-pill">Sin pagar</span> texto')])).toBeNull()
  })

  it('valores: a la derecha si el título es de cantidades o dinero y todas las celdas son números', () => {
    expect(alignOf(header('Total'), [cell('$ 1.250.000'), cell('$ 90.000')])).toBe('right')
    expect(alignOf(header('Vendible'), [cell('12 uds'), cell('0')])).toBe('right')
    expect(alignOf(header('Total'), [cell('$ 1.250.000'), cell('sin dato')])).toBeNull()
  })

  it('teléfonos y documentos son dígitos pero se quedan a la izquierda', () => {
    expect(alignOf(header('Teléfono'), [cell('3001234567')])).toBeNull()
    expect(alignOf(header('Documento'), [cell('900123456')])).toBeNull()
  })
})
