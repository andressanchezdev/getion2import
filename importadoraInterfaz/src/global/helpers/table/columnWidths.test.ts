// columnWidths.test — los anchos de columna se guardan por tabla y usuario, se validan al leerlos y nunca bajan del mínimo
// conecta con: columnWidths; se corre con npm test
import { beforeEach, describe, expect, it } from 'vitest'
import { MIN_COLUMN_WIDTH, clampColumnWidth, clearColumnWidths, columnWidthsKey, readColumnWidths, writeColumnWidths } from './columnWidths'

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
