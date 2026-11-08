// columnWidths.test — los anchos de columna se guardan por tabla y usuario, se validan al leerlos y nunca bajan del mínimo
// conecta con: columnWidths; se corre con npm test
import { beforeEach, describe, expect, it } from 'vitest'
import { MIN_COLUMN_WIDTH, clampColumnWidth, clearColumnWidths, columnWidthsKey, readColumnWidths, resizeColumns, toPercentages, writeColumnWidths } from './columnWidths'

describe('columnWidths', () => {
  beforeEach(() => localStorage.clear())

  it('la llave separa tabla y usuario', () => {
    expect(columnWidthsKey(7, 'abonos')).not.toBe(columnWidthsKey(8, 'abonos'))
    expect(columnWidthsKey(7, 'abonos')).not.toBe(columnWidthsKey(7, 'creditos'))
    expect(columnWidthsKey(undefined, 'abonos')).toContain('anon')
  })

  it('guarda y recuerda los anchos', () => {
    const key = columnWidthsKey(1, 'abonos')
    writeColumnWidths(key, [120.4, 200, 96])
    expect(readColumnWidths(key, 3)).toEqual([120, 200, 96])
  })

  it('ignora lo guardado si cambió la cantidad de columnas o hay datos dañados', () => {
    const key = columnWidthsKey(1, 'abonos')
    writeColumnWidths(key, [120, 200, 96])
    expect(readColumnWidths(key, 4)).toBeNull()
    localStorage.setItem(key, 'no es json')
    expect(readColumnWidths(key, 3)).toBeNull()
    localStorage.setItem(key, JSON.stringify([10, 200, 96]))
    expect(readColumnWidths(key, 3)).toBeNull()
  })

  it('restablecer borra lo guardado', () => {
    const key = columnWidthsKey(1, 'abonos')
    writeColumnWidths(key, [120, 200])
    clearColumnWidths(key)
    expect(readColumnWidths(key, 2)).toBeNull()
  })

  it('al arrastrar nunca baja del mínimo', () => {
    expect(clampColumnWidth(100, 50)).toBe(150)
    expect(clampColumnWidth(100, -500)).toBe(MIN_COLUMN_WIDTH)
  })
})

describe('resizeColumns', () => {
  const start = [100, 200, 300, 150, 100] // total 850; la primera y la última van pegadas a los bordes

  it('agrandar una columna del medio le quita ancho a la siguiente y el total no cambia', () => {
    const widths = resizeColumns(start, 1, 40)
    expect(widths).toEqual([100, 240, 260, 150, 100])
    expect(widths.reduce((a, b) => a + b, 0)).toBe(850)
  })

  it('achicar una columna del medio se lo da a la siguiente: la última no se mueve ni deja espacio', () => {
    expect(resizeColumns(start, 2, -100)).toEqual([100, 200, 200, 250, 100])
  })

  it('la última columna del medio compensa con la anterior y la última no cambia', () => {
    expect(resizeColumns(start, 3, 50)).toEqual([100, 200, 250, 200, 100])
  })

  it('nunca deja una columna bajo el mínimo', () => {
    const widths = resizeColumns(start, 1, 10_000)
    expect(widths[2]).toBe(MIN_COLUMN_WIDTH)
    expect(widths.reduce((a, b) => a + b, 0)).toBe(850)
    expect(resizeColumns(start, 1, -10_000)[1]).toBe(MIN_COLUMN_WIDTH)
  })

  it('toPercentages suma 100', () => {
    expect(toPercentages([100, 300]).reduce((a, b) => a + b, 0)).toBeCloseTo(100)
  })
})
