// useColumnResize · deja ajustar el ancho de las columnas arrastrando el borde derecho de cada encabezado, y lo recuerda
// conecta con: DataTable (lo usa) y global/helpers/table/columnWidths (guardado por tabla y usuario); trabaja sobre el DOM de la tabla porque los encabezados los escribe cada pantalla
// ojo: el primer arrastre congela los anchos actuales de todas las columnas (layout fijo) y la tabla pasa a desplazarse en horizontal si hace falta; doble clic en el borde restablece
import { useLayoutEffect, type RefObject } from 'react'
import { MIN_COLUMN_WIDTH, clampColumnWidth, clearColumnWidths, readColumnWidths, writeColumnWidths } from '@/global/helpers/table/columnWidths'

const HANDLE_CLASS = 'col-resizer'
const RESIZED_CLASS = 'is-resized'

const headerCells = (table: HTMLTableElement): HTMLTableCellElement[] =>
  Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).filter((cell) => cell.colSpan <= 1)

// fija el ancho de todas las columnas en píxeles y pasa la tabla a layout fijo
const applyWidths = (table: HTMLTableElement, cells: HTMLTableCellElement[], widths: number[]) => {
  cells.forEach((cell, index) => {
    cell.style.width = `${widths[index]}px`
    cell.style.minWidth = `${MIN_COLUMN_WIDTH}px`
  })
  table.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`
  table.classList.add(RESIZED_CLASS)
}

const resetWidths = (table: HTMLTableElement, cells: HTMLTableCellElement[]) => {
  cells.forEach((cell) => {
    cell.style.width = ''
    cell.style.minWidth = ''
  })
  table.style.width = ''
  table.classList.remove(RESIZED_CLASS)
}

export const useColumnResize = (tableRef: RefObject<HTMLTableElement | null>, storageKey: string): void => {
  // se corre en cada pintado: es idempotente (agrega los tiradores que falten y reaplica lo guardado una sola vez)
  useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return
    const cells = headerCells(table)
    if (cells.length === 0) return

    if (!table.classList.contains(RESIZED_CLASS)) {
      const saved = readColumnWidths(storageKey, cells.length)
      if (saved) applyWidths(table, cells, saved)
    }

    cells.forEach((cell, index) => {
      if (cell.querySelector(`:scope > .${HANDLE_CLASS}`)) return
      const handle = document.createElement('span')
      handle.className = HANDLE_CLASS
      handle.setAttribute('role', 'separator')
      handle.setAttribute('aria-orientation', 'vertical')
      handle.title = 'Arrastra para ajustar el ancho · doble clic para restablecer'

      handle.addEventListener('dblclick', (event) => {
        event.stopPropagation()
        clearColumnWidths(storageKey)
        resetWidths(table, headerCells(table))
      })

      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const all = headerCells(table)
        const startWidths = all.map((item) => item.getBoundingClientRect().width)
        const startX = event.clientX
        handle.setPointerCapture(event.pointerId)
        applyWidths(table, all, startWidths)

        const onMove = (move: PointerEvent) => {
          const widths = [...startWidths]
          widths[index] = clampColumnWidth(startWidths[index], move.clientX - startX)
          applyWidths(table, all, widths)
        }
        const onUp = (up: PointerEvent) => {
          handle.releasePointerCapture(up.pointerId)
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
          writeColumnWidths(storageKey, headerCells(table).map((item) => item.getBoundingClientRect().width))
        }
        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
      })

      cell.appendChild(handle)
    })
  })
}
