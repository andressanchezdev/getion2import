// realtime.contract.test · valida los 48 ejemplos del contrato v1 contra sus JSON Schemas (envelope + events/<tipo>.schema.json)
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { REALTIME_EVENT_TYPE_LIST } from './realtime.contract'

const CONTRACT_DIR = path.resolve(process.cwd(), '../importadoraRealtime/contract')
const SCHEMAS_DIR = path.join(CONTRACT_DIR, 'schemas')
const EVENTS_SCHEMAS_DIR = path.join(SCHEMAS_DIR, 'events')
const EXAMPLES_DIR = path.join(CONTRACT_DIR, 'examples')

interface JsonSchema {
  type?: string
  const?: unknown
  enum?: unknown[]
  required?: string[]
  properties?: Record<string, JsonSchema>
  additionalProperties?: boolean
  items?: JsonSchema
  maxItems?: number
  minimum?: number
  minLength?: number
  format?: string
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
}

const validateAgainstSchema = (value: unknown, schema: JsonSchema, at = '$'): string[] => {
  const errors: string[] = []

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: se esperaba const ${JSON.stringify(schema.const)}, llegó ${JSON.stringify(value)}`)
    return errors
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: ${JSON.stringify(value)} no está en enum`)
    return errors
  }

  if (schema.anyOf) {
    const matchesAny = schema.anyOf.some((branch) => validateAgainstSchema(value, branch, at).length === 0)
    if (!matchesAny) {
      errors.push(`${at}: no cumple ninguna rama de anyOf`)
    }
    return errors
  }

  if (schema.oneOf) {
    const matchCount = schema.oneOf.filter((branch) => validateAgainstSchema(value, branch, at).length === 0).length
    if (matchCount !== 1) {
      errors.push(`${at}: debía cumplir exactamente 1 rama de oneOf y cumplió ${matchCount}`)
    }
    return errors
  }

  if (schema.type) {
    switch (schema.type) {
      case 'null':
        if (value !== null) errors.push(`${at}: se esperaba null`)
        return errors
      case 'boolean':
        if (typeof value !== 'boolean') errors.push(`${at}: se esperaba boolean`)
        return errors
      case 'integer':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push(`${at}: se esperaba integer`)
          return errors
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          errors.push(`${at}: ${value} < minimum ${schema.minimum}`)
        }
        return errors
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push(`${at}: se esperaba number`)
          return errors
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          errors.push(`${at}: ${value} < minimum ${schema.minimum}`)
        }
        return errors
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${at}: se esperaba string`)
          return errors
        }
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          errors.push(`${at}: longitud ${value.length} < minLength ${schema.minLength}`)
        }
        if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
          errors.push(`${at}: formato date-time inválido (${value})`)
        }
        return errors
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${at}: se esperaba array`)
          return errors
        }
        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
          errors.push(`${at}: ${value.length} > maxItems ${schema.maxItems}`)
        }
        if (schema.items) {
          value.forEach((item, idx) => {
            errors.push(...validateAgainstSchema(item, schema.items!, `${at}[${idx}]`))
          })
        }
        return errors
      case 'object': {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${at}: se esperaba object`)
          return errors
        }
        const record = value as Record<string, unknown>
        for (const reqKey of schema.required ?? []) {
          if (!(reqKey in record)) {
            errors.push(`${at}: falta propiedad requerida '${reqKey}'`)
          }
        }
        const props = schema.properties ?? {}
        for (const [k, propSchema] of Object.entries(props)) {
          if (k in record) {
            errors.push(...validateAgainstSchema(record[k], propSchema, `${at}.${k}`))
          }
        }
        if (schema.additionalProperties === false) {
          for (const k of Object.keys(record)) {
            if (!(k in props)) {
              errors.push(`${at}: propiedad no permitida '${k}'`)
            }
          }
        }
        return errors
      }
    }
  }

  return errors
}

describe('realtime.contract · validación de schemas y ejemplos v1', () => {
  const envelopeSchema = JSON.parse(
    fs.readFileSync(path.join(SCHEMAS_DIR, 'envelope.schema.json'), 'utf8')
  ) as JsonSchema
  const clientMsgSchema = JSON.parse(
    fs.readFileSync(path.join(SCHEMAS_DIR, 'client-message.schema.json'), 'utf8')
  ) as JsonSchema

  it('valida los 48 ejemplos contra envelope.schema.json y su schema de evento', () => {
    expect(REALTIME_EVENT_TYPE_LIST.length).toBe(48)

    for (const eventType of REALTIME_EVENT_TYPE_LIST) {
      const examplePath = path.join(EXAMPLES_DIR, `${eventType}.json`)
      const eventSchemaPath = path.join(EVENTS_SCHEMAS_DIR, `${eventType}.schema.json`)

      expect(fs.existsSync(examplePath), `Falta ejemplo ${eventType}.json`).toBe(true)
      expect(fs.existsSync(eventSchemaPath), `Falta schema ${eventType}.schema.json`).toBe(true)

      const example = JSON.parse(fs.readFileSync(examplePath, 'utf8')) as {
        type: string
        data: unknown
      }
      const eventSchema = JSON.parse(fs.readFileSync(eventSchemaPath, 'utf8')) as JsonSchema

      expect(example.type).toBe(eventType)
      expect(validateAgainstSchema(example, envelopeSchema), `Sobre inválido en ${eventType}`).toEqual([])
      expect(validateAgainstSchema(example.data, eventSchema), `Data inválida en ${eventType}`).toEqual([])
    }
  })

  it('valida los mensajes del cliente (hello y pong) contra client-message.schema.json', () => {
    expect(validateAgainstSchema({ type: 'hello', v: 1, lastSeq: null }, clientMsgSchema)).toEqual([])
    expect(validateAgainstSchema({ type: 'hello', v: 1, lastSeq: 42 }, clientMsgSchema)).toEqual([])
    expect(validateAgainstSchema({ type: 'pong', ts: 1731360000000 }, clientMsgSchema)).toEqual([])
    expect(validateAgainstSchema({ type: 'otro' }, clientMsgSchema).length).toBeGreaterThan(0)
  })
})

