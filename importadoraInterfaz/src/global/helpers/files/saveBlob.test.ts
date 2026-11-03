// saveBlob.test · el nombre del archivo que manda el backend
// conecta con: saveBlob (filenameFromDisposition); se corre con npm test
import { describe, expect, it } from 'vitest'
import { filenameFromDisposition } from './saveBlob'

describe('filenameFromDisposition', () => {
  it('lee el nombre entre comillas o sin ellas', () => {
    expect(filenameFromDisposition('attachment; filename="OC-1.xlsx"', 'x.xlsx')).toBe('OC-1.xlsx')
    expect(filenameFromDisposition('attachment; filename=OC-2.xlsx', 'x.xlsx')).toBe('OC-2.xlsx')
  })

  it('sin encabezado usa el de respaldo', () => {
    expect(filenameFromDisposition(undefined, 'respaldo.xlsx')).toBe('respaldo.xlsx')
  })
})
