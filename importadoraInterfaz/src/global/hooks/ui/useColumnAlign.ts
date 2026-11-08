// useColumnAlign · alinea cada columna de una tabla según lo que contiene, igual en el encabezado y en las celdas: acciones y estados al centro, números y valores a la derecha, el resto a la izquierda
// conecta con: DataTable (lo usa) y styles/data-table.css ([data-align]); trabaja sobre el DOM porque los encabezados y las filas los escribe cada pantalla
// ojo: se decide por el contenido de las filas que hay (todas deben cumplir) y, para los números, también por el título (total, valor, cantidad...); sin filas se decide por el título del encabezado («Acciones», «Estado»); no cambia ningún estado de React, solo pone data-align
import { useLayoutEffect, type RefObject } from 'react'

type Align = 'center' | 'right'

const ACTIONS_SELECTOR = '.row-actions, .row-actions-none'
const BADGE_SELECTOR = '.ui-pill, select.inv-status-select, .table-badge-bg, .abonos-status-select'
// «$ 1.250.000», «− 5.000», «12 uds», «30 días», «19 %»
const NUMERIC = /^[−+-]?\s*\$?\s*\d[\d.,]*\s*(uds?|und|días|%)?$/i
// los números a la derecha son cantidades y valores; teléfonos, documentos y códigos también son dígitos pero se leen a la izquierda, por eso se mira el título
const NUMERIC_TITLE = /total|monto|valor|precio|cupo|saldo|disponible|vendible|físico|reservado|cantidad|unidades|stock|costo|ubicaciones|skus|tamaño|diferencia|abono|deuda/i

const headerCells = (table: HTMLTableElement): HTMLTableCellElement[] => Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).filter((cell) => cell.colSpan <= 1)

const titleOf = (cell: HTMLTableCellElement): string => (cell.textContent ?? '').trim().toLowerCase()

export const alignOf = (header: HTMLTableCellElement, cells: HTMLTableCellElement[]): Align | null => {
  const title = titleOf(header)
  const filled = cells.filter((cell) => (cell.textContent ?? '').trim() !== '' || cell.children.length > 0)
  if (title === 'acciones' || (filled.length > 0 && filled.every((cell) => cell.querySelector(ACTIONS_SELECTOR)))) return 'center'
  if (title === 'estado' || (filled.length > 0 && filled.every((cell) => cell.children.length === 1 && cell.firstElementChild?.matches(BADGE_SELECTOR) && (cell.textContent ?? '').trim() === (cell.firstElementChild.textContent ?? '').trim()))) return 'center'
  if (filled.length > 0 && NUMERIC_TITLE.test(title) && filled.every((cell) => NUMERIC.test((cell.textContent ?? '').trim()))) return 'right'
  return null
}

export const useColumnAlign = (tableRef: RefObject<HTMLTableElement | null>): void => {
  // se corre en cada pintado: es idempotente y no toca el estado de React
  useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return
    const headers = headerCells(table)
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).filter((row) => row.children.length === headers.length)
    headers.forEach((header, index) => {
      const cells = rows.map((row) => row.children[index] as HTMLTableCellElement)
      const align = alignOf(header, cells)
      for (const cell of [header, ...cells]) {
        if (align) cell.setAttribute('data-align', align)
        else cell.removeAttribute('data-align')
      }
    })
  })
}
