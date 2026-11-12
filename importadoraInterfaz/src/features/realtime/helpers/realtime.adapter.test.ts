// realtime.adapter.test · verifica que los 48 ejemplos del contrato v1 sean aceptados y que JSON roto, v != 1 o tipos desconocidos den null
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseEnvelope } from './realtime.adapter'
import { REALTIME_EVENT_TYPE_LIST } from '../types/realtime.contract'

const EXAMPLES_DIR = path.resolve(process.cwd(), '../importadoraRealtime/contract/examples')

describe('realtime.adapter · parseEnvelope', () => {
  it('acepta los 48 ejemplos oficiales de importadoraRealtime/contract/examples', () => {
    const files = fs.readdirSync(EXAMPLES_DIR).filter((file) => file.endsWith('.json'))
    expect(files.length).toBe(48)

    const seenTypes = new Set<string>()
    for (const file of files) {
      const raw = fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8')
      const parsed = parseEnvelope(raw)
      expect(parsed, `Ejemplo ${file} debe ser válido`).not.toBeNull()
      if (parsed) {
        expect(parsed.v).toBe(1)
        seenTypes.add(parsed.type)
      }
    }

    expect(seenTypes.size).toBe(REALTIME_EVENT_TYPE_LIST.length)
  })

  it('devuelve null ante JSON roto, v distinto de 1 o tipo desconocido', () => {
    expect(parseEnvelope('{json roto')).toBeNull()
    expect(parseEnvelope(null)).toBeNull()
    expect(parseEnvelope(123)).toBeNull()

    const sampleRaw = fs.readFileSync(path.join(EXAMPLES_DIR, 'stock.changed.json'), 'utf8')
    const sample = JSON.parse(sampleRaw) as Record<string, unknown>

    expect(parseEnvelope(JSON.stringify({ ...sample, v: 2 }))).toBeNull()
    expect(parseEnvelope(JSON.stringify({ ...sample, type: 'evento.inexistente' }))).toBeNull()
    expect(parseEnvelope(JSON.stringify({ ...sample, seq: -1 }))).toBeNull()
    expect(parseEnvelope(JSON.stringify({ ...sample, data: null }))).toBeNull()
  })
})

