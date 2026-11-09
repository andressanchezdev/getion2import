// useColumnResize · deja ajustar el ancho de las columnas arrastrando el borde derecho de cada encabezado, y lo recuerda
// conecta con: DataTable (lo usa) y global/helpers/table/columnWidths (guardado por tabla y usuario); trabaja sobre el DOM de la tabla porque los encabezados los escribe cada pantalla
// ojo: el primer arrastre congela los anchos actuales de todas las columnas (layout fijo) y la tabla pasa a desplazarse en horizontal si hace falta; doble clic en el borde o el botón de recarga (reset) restablecen
// devuelve isResized (la tabla ya no tiene su distribución original) y reset (vuelve a la distribución original y olvida lo guardado)
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'
import { MIN_COLUMN_WIDTH, clearColumnWidths, readColumnWidths, resizeColumns, toPercentages, writeColumnWidths } from '@/global/helpers/table/columnWidths'

const HANDLE_CLASS = 'col-resizer'
const RESIZED_CLASS = 'is-resized'

const headerCells = (table: HTMLTableElement): HTMLTableCellElement[] =>
  Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).filter((cell) => cell.colSpan <= 1)

// fija el ancho de cada columna como porcentaje del total y pasa la tabla a layout fijo con el 100 % del espacio: así la tabla siempre llena su contenedor (la primera columna queda pegada a la izquierda y la última a la derecha)
const applyWidths = (table: HTMLTableElement, cells: HTMLTableCellElement[], widths: number[]) => {
  const percentages = toPercentages(widths)
  cells.forEach((cell, index) => {
    cell.style.width = `${percentages[index]}%`
    cell.style.minWidth = `${MIN_COLUMN_WIDTH}px`
  })
  table.style.width = '100%'
  table.style.minWidth = `${cells.length * MIN_COLUMN_WIDTH}px`
  table.classList.add(RESIZED_CLASS)
}

const resetWidths = (table: HTMLTableElement, cells: HTMLTableCellElement[]) => {
  cells.forEach((cell) => {
    cell.style.width = ''
    cell.style.minWidth = ''
  })
  table.style.width = ''
  table.style.minWidth = ''
  table.classList.remove(RESIZED_CLASS)
}

export const useColumnResize = (tableRef: RefObject<HTMLTableElement | null>, storageKey: string): { isResized: boolean; reset: () => void } => {
  const [isResized, setIsResized] = useState(false)

  const reset = useCallback(() => {
    const table = tableRef.current
    clearColumnWidths(storageKey)
    if (table) resetWidths(table, headerCells(table))
    setIsResized(false)
  }, [tableRef, storageKey])

  // se corre en cada pintado: es idempotente (agrega los tiradores que falten y reaplica lo guardado una sola vez)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- corre en cada pintado a propósito; setIsResized con el mismo valor no vuelve a pintar
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
        reset()
      })

      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const all = headerCells(table)
        const startWidths = all.map((item) => item.getBoundingClientRect().width)
        const startX = event.clientX
        const wasResized = table.classList.contains(RESIZED_CLASS)
        let moved = false
        handle.setPointerCapture(event.pointerId)
        applyWidths(table, all, startWidths)

        const onMove = (move: PointerEvent) => {
          moved = true
          // el cambio se reparte con la columna vecina: el total no cambia y la última columna no se despega del borde
          applyWidths(table, all, resizeColumns(startWidths, index, move.clientX - startX))
        }
        const onUp = (up: PointerEvent) => {
          handle.releasePointerCapture(up.pointerId)
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
          // un clic sin arrastrar no cambia nada: si la tabla estaba en su distribución original, vuelve a ella
          if (!moved && !wasResized) {
            resetWidths(table, headerCells(table))
          } else {
            writeColumnWidths(storageKey, headerCells(table).map((item) => item.getBoundingClientRect().width))
          }
          setIsResized(table.classList.contains(RESIZED_CLASS))
        }
        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
      })

      cell.appendChild(handle)
    })

    // el botón de recarga solo se ofrece cuando la distribución ya no es la original (si no cambia, React no vuelve a pintar)
    setIsResized(table.classList.contains(RESIZED_CLASS))
  })

  return { isResized, reset }
}
