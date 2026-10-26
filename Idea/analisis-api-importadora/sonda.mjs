// sonda · script único del análisis de la API de Gestión Importadora (solo lectura: no modifica el repo de la app)
// uso:  node sonda.mjs config      → valida src/api/config.ts contra el Swagger y contra lo que la app realmente llama; imprime tablas en markdown
//       node sonda.mjs inventario  → arma datos/respuestas.json con las 189 operaciones del Swagger (clase, cuerpo, uso en la app) sin llamar a la API
// ojo: este script NUNCA escribe dentro de appImportadoraIp; solo lee sus archivos. La sonda con llamadas reales (fase 3) se agrega después y solo para lecturas
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP = process.env.APP_DIR || path.resolve(HERE, '..', 'GestionImportadora', 'appImportadoraIp')
const CONFIG = path.join(APP, 'src', 'api', 'config.ts')
const SWAGGER = path.join(HERE, 'datos', 'swagger.json')
const OUT = path.join(HERE, 'datos', 'respuestas.json')
const METHODS = ['get', 'post', 'put', 'delete', 'patch']

const swagger = JSON.parse(fs.readFileSync(SWAGGER, 'utf8'))
const ref = (schema) => schema?.$ref?.split('/').pop()

// ---------- Swagger: lista de operaciones ----------
const operations = []
for (const [route, ops] of Object.entries(swagger.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    if (!METHODS.includes(method)) continue
    const body = (op.parameters || []).find((p) => p.in === 'body')
    const ok = op.responses?.['200'] || op.responses?.['201'] || op.responses?.['204']
    const data = ok?.schema?.allOf?.[1]?.properties?.data
    operations.push({
      key: `${method.toUpperCase()} ${route}`,
      method: method.toUpperCase(),
      route,
      tag: (op.tags || ['sin-grupo'])[0],
      summary: op.summary || '',
      requiereToken: Boolean(op.security?.length),
      cuerpo: ref(body?.schema) || null,
      cuerpoCampos: body ? Object.keys(swagger.definitions[ref(body.schema)]?.properties || {}) : [],
      respuesta: ref(data) || ref(data?.items) || data?.type || ok?.description || null,
      respuestaEsLista: data?.type === 'array',
      tienePaginacion: Boolean(ok?.schema?.allOf?.[1]?.properties?.meta),
      codigosDocumentados: Object.keys(op.responses || {}),
    })
  }
}

// ---------- config.ts: entradas con su comentario ----------
// lee GRUPO: { y CLAVE: '/ruta' (o función con plantilla), y junta los comentarios de la línea y de las líneas siguientes hasta la próxima clave
const parseConfig = () => {
  const lines = fs.readFileSync(CONFIG, 'utf8').split(/\r?\n/)
  const entries = []
  let group = null
  let last = null
  for (const line of lines) {
    const g = line.match(/^ {4}([A-Z_]+): \{/)
    if (g) { group = g[1]; last = null; continue }
    const e = line.match(/^ {6}([A-Z_]+):\s*(?:'([^']+)'|\([^)]*\)\s*=>\s*`([^`]+)`)\s*,?\s*(?:\/\/\s*(.*))?$/)
    if (e && group) {
      const rawPath = e[2] || e[3].replace(/\$\{[^}]+\}/g, '{id}')
      last = { grupo: group, clave: e[1], ruta: rawPath, comentario: (e[4] || '').trim() }
      entries.push(last)
      continue
    }
    const c = line.match(/^\s*\/\/\s?(.*)$/)
    if (c && last) last.comentario += ' ' + c[1].trim()
  }
  return entries.map((x) => ({ ...x, comentario: x.comentario.trim() }))
}

// ---------- código de la app: qué método llama de verdad cada GRUPO.CLAVE ----------
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.isDirectory()) return /^(global2|features2|node_modules)$/.test(d.name) ? [] : walk(path.join(dir, d.name))
    return /\.(ts|tsx)$/.test(d.name) && !/\.test\.(ts|tsx)$/.test(d.name) ? [path.join(dir, d.name)] : []
  })

const parseUsage = () => {
  const usage = {}
  const call = /apiClient\.(get|post|put|delete|patch)(?:<[^(]*?>)?\(\s*(?:API_CONFIG\.ENDPOINTS\.)?([A-Z_]+)\.([A-Z_]+)/g
  const anyRef = /(?:API_CONFIG\.ENDPOINTS\.|\b)([A-Z_]{3,})\.([A-Z_]{2,})\b/g
  for (const file of walk(path.join(APP, 'src'))) {
    if (file.endsWith(path.join('api', 'config.ts'))) continue
    const text = fs.readFileSync(file, 'utf8')
    const rel = path.relative(APP, file).split(path.sep).join('/')
    for (const m of text.matchAll(call)) {
      const k = `${m[2]}.${m[3]}`
      ;(usage[k] ??= { metodos: new Set(), archivos: new Set() }).metodos.add(m[1].toUpperCase())
      usage[k].archivos.add(rel)
    }
    for (const m of text.matchAll(anyRef)) {
      const k = `${m[1]}.${m[2]}`
      if (usage[k]) usage[k].archivos.add(rel)
      else (usage[k] ??= { metodos: new Set(), archivos: new Set() }).archivos.add(rel)
    }
  }
  return usage
}

// ---------- comando: config ----------
const swaggerMethods = (route) => operations.filter((o) => o.route === route).map((o) => o.method)

const runConfig = () => {
  const entries = parseConfig()
  const usage = parseUsage()
  const hallazgos = []
  const byRoute = {}
  for (const e of entries) {
    const k = `${e.grupo}.${e.clave}`
    const sw = swaggerMethods(e.ruta)
    const used = usage[k]
    const usedMethods = used ? [...used.metodos] : []
    const claimed = [...new Set((e.comentario.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/g) || []))]
    ;(byRoute[e.ruta] ??= []).push(k)
    const issues = []
    if (sw.length === 0 && !e.ruta.startsWith('/swagger')) issues.push('ERROR: la ruta NO existe en el Swagger')
    for (const m of usedMethods) if (sw.length && !sw.includes(m)) issues.push(`ERROR: la app llama con ${m} pero el Swagger define ${sw.join('/')}`)
    for (const m of claimed) if (sw.length && !sw.includes(m)) issues.push(`AVISO: tu comentario dice ${m} pero el Swagger define ${sw.join('/')}`)
    if (!used || used.archivos.size === 0) issues.push('INFO: ninguna parte de la app usa esta clave')
    hallazgos.push({ k, ruta: e.ruta, swagger: sw.join('/') || '—', app: usedMethods.join('/') || (used ? 'referenciada' : '—'), issues })
  }
  for (const [route, keys] of Object.entries(byRoute)) {
    if (keys.length > 1) for (const h of hallazgos.filter((x) => keys.includes(x.k))) h.issues.push(`AVISO: la misma ruta está en ${keys.join(' y ')}`)
  }

  const covered = new Set(entries.map((e) => e.ruta))
  const notInConfig = operations.filter((o) => !covered.has(o.route))
  const tagCount = {}
  for (const o of notInConfig) tagCount[o.tag] = (tagCount[o.tag] || 0) + 1

  const table = (rows) => rows.map((r) => `| \`${r.k}\` | \`${r.ruta}\` | ${r.swagger} | ${r.app} | ${r.issues.join('<br>') || 'OK'} |`).join('\n')
  console.log(`## Validación de config.ts (${entries.length} entradas, ${hallazgos.filter((h) => h.issues.some((i) => i.startsWith('ERROR'))).length} con ERROR)\n`)
  console.log('| Clave | Ruta | Método(s) en Swagger | Método que llama la app | Resultado |\n|---|---|---|---|---|')
  console.log(table(hallazgos))
  console.log(`\n### Operaciones del Swagger que config.ts no declara: ${notInConfig.length} de ${operations.length}\n`)
  console.log(Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `- ${t}: ${n}`).join('\n'))
}

// ---------- comando: inventario ----------
// ojo: la clase decide qué se puede sondear en la fase 3; se revisa a mano antes de llamar a nada
// regla: GET es lectura; un POST es lectura solo si su resumen del Swagger empieza por un verbo de consulta (Get, Search, Filter, Check, Validate, Generate...);
// cualquier otro POST, PUT o DELETE se trata como escritura (por ejemplo "Create a new company", "Save or update...", "Receive items...")
const READ_SUMMARY = /^(get|search|filter|check|validate|universal search|generate|list|retrieve)\b/i
const classOf = (o) => {
  if (o.route.startsWith('/auth')) return 'sesión'
  // en SIIGO y Sync los POST "Get ..." son consultas (como /carts); el resto escribe en sistemas externos
  if (['SIIGO', 'Sync'].includes(o.tag)) return o.method === 'POST' && /^(get|retrieve)\b/i.test(o.summary) ? 'lectura' : 'crítico'
  if (o.method === 'GET') return 'lectura'
  if (o.method === 'POST' && READ_SUMMARY.test(o.summary) && !/update|save|receive/i.test(o.summary)) return 'lectura'
  return 'escritura'
}

const runInventario = () => {
  const entries = parseConfig()
  const usage = parseUsage()
  const inConfig = {}
  for (const e of entries) (inConfig[e.ruta] ??= []).push(`${e.grupo}.${e.clave}`)
  const data = {}
  for (const o of operations) {
    const keys = inConfig[o.route] || []
    data[o.key] = {
      grupo: o.tag,
      resumen: o.summary,
      clase: classOf(o),
      requiereToken: o.requiereToken,
      cuerpo: o.cuerpo,
      cuerpoCampos: o.cuerpoCampos,
      respuestaDocumentada: o.respuesta,
      esLista: o.respuestaEsLista,
      tienePaginacion: o.tienePaginacion,
      codigosDocumentados: o.codigosDocumentados,
      enConfig: keys,
      usadoPorApp: keys.some((k) => usage[k]?.archivos.size > 0),
      respuestaReal: null, // se llena en la fase 3 con la sonda de lectura
      clasificacion: null, // completo | incompleto | roto | no sirve | sin probar (fase 4)
    }
  }
  // ojo: si ya hay respuestas de la sonda o clasificaciones, se conservan (inventario no las borra)
  if (fs.existsSync(OUT)) {
    const previous = JSON.parse(fs.readFileSync(OUT, 'utf8'))
    for (const [k, v] of Object.entries(data)) {
      if (previous[k]?.respuestaReal) v.respuestaReal = previous[k].respuestaReal
      if (previous[k]?.clasificacion) v.clasificacion = previous[k].clasificacion
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
  const count = {}
  for (const v of Object.values(data)) count[v.clase] = (count[v.clase] || 0) + 1
  console.log(`datos/respuestas.json: ${Object.keys(data).length} operaciones`, count)
  console.log('usadas por la app:', Object.values(data).filter((v) => v.usadoPorApp).length)
}

// ---------- comando: sondear (fase 3) ----------
// sin --enviar solo muestra el plan (qué llamaría y con qué cuerpo); con --enviar hace las llamadas
// seguridad: solo se llama a operaciones de clase "lectura"; nunca a DENY; el token sale de API_TOKEN y no se guarda ni se muestra; la respuesta se guarda recortada y sin datos personales
const API_BASE = process.env.API_BASE || 'https://importadora-back-production.up.railway.app'
const DENY = [/^\/employees\/access-credentials/] // devuelve credenciales de acceso: nunca se llama
const SENSITIVE_KEY = /^(email|mailInvoicing|phone|cellPhone|identification|dni|nit|address|password|photo|picture)$|token|secret|credential|password/i
const MAX_ROWS_KEPT = 3 // filas que se guardan de cada lista (de las 30 primeras se miden los tipos)
const MAX_ROWS_MEASURED = 30

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

// reemplaza un valor sensible por su tipo y largo, para conservar la forma sin guardar el dato
const maskValue = (v) => (v === null || v === undefined ? v : `«${kindOf(v)}:${String(v).length}»`)

// copia recortada y sin datos personales: pocas filas, textos cortos, claves sensibles y nombres de persona enmascarados
const maskTrim = (value, depth = 0) => {
  if (depth > 6) return '«profundo»'
  if (Array.isArray(value)) return value.slice(0, MAX_ROWS_KEPT).map((x) => maskTrim(x, depth + 1))
  if (value && typeof value === 'object') {
    const isPerson = typeof value.lastName === 'string'
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SENSITIVE_KEY.test(k) || (isPerson && (k === 'name' || k === 'lastName')) ? maskValue(v) : maskTrim(v, depth + 1),
      ])
    )
  }
  if (typeof value === 'string' && value.length > 200) return value.slice(0, 200) + '…'
  return value
}

// mide los tipos de cada campo en las primeras filas: tipos vistos, cuántas veces apareció, cuántas era null y cuántas vacío
const observe = (value, p, acc, depth = 0) => {
  const a = (acc[p] ??= { tipos: new Set(), visto: 0, nulos: 0, vacios: 0 })
  a.visto++
  const t = kindOf(value)
  a.tipos.add(t)
  if (value === null) a.nulos++
  if (value === '' || (Array.isArray(value) && value.length === 0)) a.vacios++
  if (depth >= 4) return
  if (t === 'object') for (const [k, v] of Object.entries(value)) observe(v, `${p}.${k}`, acc, depth + 1)
  else if (t === 'array') for (const item of value.slice(0, MAX_ROWS_MEASURED)) observe(item, `${p}[]`, acc, depth + 1)
}

const dayString = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)

const runSondear = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const companyId = Number(process.env.COMPANY_ID) || null
  const pageSize = Number(process.env.PAGE_SIZE) || 5
  const delay = Number(process.env.DELAY_MS) || 400
  const searchText = process.env.SEARCH_TEXT || 'a'
  const only = (process.env.SOLO || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  const skip = (process.env.OMITIR || '').split(',').map((s) => s.trim()).filter(Boolean)

  if (!fs.existsSync(OUT)) return console.log('Falta datos/respuestas.json: corre primero  node sonda.mjs inventario')
  if (!companyId) console.log('AVISO: falta COMPANY_ID (el companyId de tu empresa); sin él casi todos los cuerpos quedan incompletos\n')
  if (enviar && !token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)  o  export API_TOKEN=tu_token  (bash)')

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const pool = {} // ids que se van descubriendo en las respuestas (userId, saleId, productId...)
  if (process.env.WAREHOUSE_ID) pool.warehouseId = Number(process.env.WAREHOUSE_ID)
  if (process.env.USER_ID) pool.userId = Number(process.env.USER_ID)
  const ALIAS = { clientId: 'userId', sellerId: 'userId', customerId: 'userId', userVerifyId: 'userId', auxWarehouseId: 'warehouseId' }
  const harvest = (payload) => {
    for (const item of (Array.isArray(payload) ? payload.slice(0, 3) : [payload])) {
      if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item)) if (/Id$/.test(k) && Number.isInteger(v) && v > 0 && !(k in pool)) pool[k] = v
      }
    }
  }

  // valor de cada campo conocido; lo que no se sabe devuelve undefined (se omite)
  // EXTRA='{"state":"pending","saleType":"sale"}' permite dar valores de dominio que el Swagger no documenta
  let extra = {}
  try { extra = JSON.parse(process.env.EXTRA || '{}') } catch { console.log('AVISO: EXTRA no es un JSON válido; se ignora\n') }
  const valueFor = (field, route, prop) => {
    if (field in extra) return extra[field]
    if (field === 'companyId') return companyId ?? undefined
    if (field === 'page') return 1
    if (field === 'pageSize' || field === 'limit') return pageSize
    if (field === 'query') return searchText
    if (field === 'type') return route === '/search' || route === '/inventory/search' ? 'product' : prop?.enum?.[0]
    if (prop?.enum?.length) return prop.enum[0] // si el Swagger lista los valores válidos, se usa el primero
    if (/^(startDate|dateStart|dateFrom|from)$/i.test(field)) return dayString(-30)
    if (/^(endDate|dateEnd|dateTo|to)$/i.test(field)) return dayString(0)
    if (/Id$/.test(field)) return pool[ALIAS[field] || field]
    return undefined
  }

  // arma ruta, query y cuerpo de una operación; "faltan" son campos obligatorios que todavía no se pueden llenar
  const build = (key, op) => {
    const [method, route] = [key.split(' ')[0], key.split(' ')[1]]
    const swOp = swagger.paths[route][method.toLowerCase()]
    const faltan = []
    let url = route
    const query = {}
    for (const p of swOp.parameters || []) {
      if (p.in === 'path') {
        const byRoute = { '/users/{id}': 'userId', '/employees/{id}': 'employeeId', '/quotations/{id}': 'quotationId', '/companies/id': 'companyId' }
        const v = p.name === 'id' ? (route === '/companies/id' ? companyId : pool[byRoute[route]]) : valueFor(p.name, route)
        if (v === undefined || v === null) faltan.push(`${p.name}(ruta)`)
        else if (url.includes(`{${p.name}}`)) url = url.replace(`{${p.name}}`, String(v))
        else query[p.name] = v // ojo: /companies/id declara el parámetro "id" pero la ruta no lo trae entre llaves: se manda como ?id=
      } else if (p.in === 'query') {
        const v = valueFor(p.name, route)
        if (v !== undefined) query[p.name] = v
        else if (p.required) faltan.push(`${p.name}(query)`)
      }
    }
    const model = op.cuerpo ? swagger.definitions[op.cuerpo] : null
    const body = {}
    for (const f of op.cuerpoCampos) {
      const v = valueFor(f, route, model?.properties?.[f])
      if (v !== undefined) body[f] = v
    }
    for (const r of model?.required || []) if (body[r] === undefined) faltan.push(r)
    const qs = Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : ''
    return { method, url: url + qs, body: op.cuerpo ? body : null, faltan }
  }

  // operaciones a sondear: solo lectura, sin DENY y respetando SOLO / OMITIR
  const targets = Object.entries(data).filter(([key, op]) => {
    const route = key.split(' ')[1]
    if (op.clase !== 'lectura' || DENY.some((r) => r.test(route))) return false
    if (!['GET', 'POST'].includes(key.split(' ')[0])) return false
    if (only.length && !only.includes(op.grupo.toLowerCase())) return false
    return !skip.includes(route)
  })
  // primero las que no necesitan ids (listados); las de detalle esperan a que haya ids descubiertos
  targets.sort((a, b) => /detail|by-|\{id\}|summary|stats|history/i.test(a[0]) - /detail|by-|\{id\}|summary|stats|history/i.test(b[0]))

  console.log(`${enviar ? 'ENVIANDO' : 'PLAN (no se envía nada; agrega --enviar para llamar a la API)'} · ${targets.length} operaciones de lectura · base ${API_BASE}\n`)

  const results = []
  let pending = targets
  let consecutive401 = 0
  let stopped = null
  for (let pass = 1; pass <= 3 && pending.length && !stopped; pass++) {
    const still = []
    for (const [key, op] of pending) {
      if (stopped) break
      const req = build(key, op)
      if (req.faltan.length) {
        if (pass < 3 && enviar) { still.push([key, op]); continue }
        if (enviar) data[key].respuestaReal = { omitido: `falta ${req.faltan.join(', ')} (no apareció en ninguna otra respuesta; se puede dar con EXTRA)` }
        console.log(`  - ${key}  → ${enviar ? 'omitida' : 'pendiente'}: necesita ${req.faltan.join(', ')}${enviar ? '' : ' (se completa con ids de otras respuestas o con EXTRA)'}`)
        continue
      }
      if (!enviar) { console.log(`  · ${key}  ${req.url !== key.split(' ')[1] ? req.url : ''} ${req.body ? JSON.stringify(req.body) : ''}`); continue }

      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
      if (op.requiereToken) headers.Authorization = `Bearer ${token}`
      const t0 = Date.now()
      let status = 0, text = '', failure = null
      try {
        const res = await fetch(API_BASE + req.url, { method: req.method, headers, body: req.body ? JSON.stringify(req.body) : undefined, signal: AbortSignal.timeout(20000) })
        status = res.status
        text = await res.text()
      } catch (error) {
        failure = error.message
      }
      const ms = Date.now() - t0
      let json = null
      try { json = JSON.parse(text) } catch { /* respuesta que no es JSON */ }

      const result = { fecha: new Date().toISOString(), estado: status || null, ms, cuerpoEnviado: req.body, ruta: req.url }
      if (failure) result.fallo = failure
      if (json && typeof json === 'object') {
        const payload = json.data
        const items = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : []
        const acc = {}
        for (const item of items.slice(0, MAX_ROWS_MEASURED)) observe(item, '$', acc)
        const fields = Object.fromEntries(
          Object.entries(acc).filter(([p]) => p !== '$').map(([p, a]) => [p.slice(2), { tipos: [...a.tipos], visto: a.visto, nulos: a.nulos, vacios: a.vacios }])
        )
        const observedTop = new Set(Object.keys(fields).filter((p) => !/[.\[]/.test(p)))
        const documented = Object.keys(swagger.definitions[op.respuestaDocumentada]?.properties || {})
        result.envoltorio = {
          success: json.success,
          message: typeof json.message === 'string' ? json.message.slice(0, 120) : json.message,
          error: typeof json.error === 'string' ? json.error.slice(0, 120) : json.error,
          tieneData: 'data' in json,
          tieneMeta: 'meta' in json,
        }
        result.dataTipo = kindOf(payload)
        result.registros = Array.isArray(payload) ? payload.length : payload && typeof payload === 'object' ? 1 : 0
        result.meta = json.meta && typeof json.meta === 'object' ? json.meta : null
        result.campos = fields
        if (documented.length && observedTop.size) {
          result.camposDocumentadosSinVer = documented.filter((f) => !observedTop.has(f))
          result.camposNoDocumentados = [...observedTop].filter((f) => !documented.includes(f))
        }
        result.muestra = maskTrim(payload)
        if (status >= 200 && status < 300) harvest(payload)
      } else if (text) {
        result.textoCrudo = text.slice(0, 200)
      }
      data[key].respuestaReal = result
      results.push([key, result])
      console.log(`  ${status >= 200 && status < 300 ? '✓' : '✗'} ${key.padEnd(44)} ${status || 'sin respuesta'} · ${ms} ms${result.registros !== undefined ? ` · ${result.registros} filas` : ''}${result.fallo ? ` · ${result.fallo}` : ''}`)

      consecutive401 = status === 401 ? consecutive401 + 1 : 0
      if (consecutive401 >= 3) stopped = 'Tres respuestas 401 seguidas: el token no sirve o venció. Se detiene.'
      if (status === 429) stopped = 'El servidor respondió 429 (demasiadas peticiones). Se detiene; sube DELAY_MS y reintenta.'
      await new Promise((r) => setTimeout(r, delay))
    }
    pending = still
  }

  if (enviar) {
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
    const by = {}
    for (const [, r] of results) by[r.estado ?? 'sin respuesta'] = (by[r.estado ?? 'sin respuesta'] || 0) + 1
    console.log(`\nListo: ${results.length} llamadas · por código HTTP:`, by)
    console.log(`Guardado en ${path.relative(process.cwd(), OUT)} (sin token y con datos personales enmascarados). Pásame ese archivo.`)
    if (stopped) console.log('\n' + stopped)
  }
}

// ---------- comando: barrido (fase 3b) ----------
// Solo LECTURAS que necesitan un valor de dominio que el Swagger no documenta (estado, canal, tipo de venta, dispositivo).
// Prueba varios valores de uno en uno y guarda qué respondió cada uno dentro de datos/respuestas.json (campo respuestaReal.barrido).
// POST /management y POST /management/saleOrders son consultas; POST /sync/status se arma con el deviceId que devuelva POST /sync/devices.
const runBarrido = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const companyId = Number(process.env.COMPANY_ID) || null
  const warehouseId = Number(process.env.WAREHOUSE_ID) || null
  const delay = Number(process.env.DELAY_MS) || 400
  const list = (name, fallback) => (process.env[name] || fallback).split(',').map((s) => s.trim()).filter(Boolean)
  const estados = list('ESTADOS', 'pending,verification,picking,packing,invoicing,dispatch,delivered,approved,cancelled')
  const canales = list('CANALES', 'store,online,whatsapp,pos,web')

  if (!companyId || !warehouseId) return console.log('Faltan COMPANY_ID y WAREHOUSE_ID (por ejemplo COMPANY_ID=1 WAREHOUSE_ID=1)')
  if (enviar && !token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)')
  if (!fs.existsSync(OUT)) return console.log('Falta datos/respuestas.json: corre primero  node sonda.mjs inventario')

  const plan = [
    ...estados.map((state) => ({ key: 'POST /management', url: '/management', body: { companyId, warehouseId, state } })),
    ...estados.flatMap((invoiceStatus) => canales.map((saleChannel) => ({ key: 'POST /management/saleOrders', url: '/management/saleOrders', body: { companyId, warehouseId, invoiceStatus, saleChannel, saleType: 'sale', page: 1, pageSize: 3 } }))),
    ...estados.map((invoiceStatus) => ({ key: 'POST /management/saleOrders', url: '/management/saleOrders', body: { companyId, warehouseId, invoiceStatus, saleChannel: canales[0], saleType: 'traslade', page: 1, pageSize: 3 } })),
    { key: 'POST /sync/devices', url: '/sync/devices', body: { companyId, warehouseId } },
  ]
  if (!enviar) {
    console.log(`PLAN (no se envía nada; agrega --enviar): ${plan.length} consultas de solo lectura, una por una, con ${delay} ms de pausa\n`)
    for (const step of plan.slice(0, 12)) console.log(`  · ${step.key}  ${JSON.stringify(step.body)}`)
    return console.log(`  ... y ${Math.max(0, plan.length - 12)} más (POST /sync/status se arma con el deviceId que devuelva /sync/devices)`)
  }

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const call = async (step) => {
    const t0 = Date.now()
    let status = 0, text = '', failure = null
    try {
      const res = await fetch(API_BASE + step.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(step.body), signal: AbortSignal.timeout(20000) })
      status = res.status
      text = await res.text()
    } catch (error) {
      failure = error.message
    }
    let json = null
    try { json = JSON.parse(text) } catch { /* no es JSON */ }
    const payload = json?.data
    const rows = Array.isArray(payload) ? payload.length : payload && typeof payload === 'object' ? 1 : 0
    const summary = {
      cuerpo: step.body, estado: status || null, ms: Date.now() - t0, mensaje: typeof json?.message === 'string' ? json.message.slice(0, 100) : undefined,
      error: typeof json?.error === 'string' ? json.error.slice(0, 120) : undefined, filas: rows,
      total: json?.meta?.totalRecords, muestra: rows ? maskTrim(Array.isArray(payload) ? payload.slice(0, 2) : payload) : undefined,
    }
    if (failure) summary.fallo = failure
    return { summary, payload, status }
  }

  const grouped = {}
  let deviceId = null
  let consecutive401 = 0
  for (const step of plan) {
    const { summary, payload, status } = await call(step)
    ;(grouped[step.key] ??= []).push(summary)
    if (step.key === 'POST /sync/devices' && Array.isArray(payload?.devices) && payload.devices[0]?.deviceId) deviceId = payload.devices[0].deviceId
    console.log(`  ${status >= 200 && status < 300 ? '✓' : '✗'} ${step.key.padEnd(30)} ${JSON.stringify(Object.fromEntries(Object.entries(step.body).filter(([k]) => ['state', 'invoiceStatus', 'saleChannel', 'saleType'].includes(k))))} → ${status || 'sin respuesta'} · ${summary.filas} filas`)
    consecutive401 = status === 401 ? consecutive401 + 1 : 0
    if (consecutive401 >= 3) { console.log('\nTres 401 seguidos: el token no sirve o venció. Se detiene.'); break }
    if (status === 429) { console.log('\n429: demasiadas peticiones. Se detiene; sube DELAY_MS.'); break }
    await new Promise((r) => setTimeout(r, delay))
  }
  if (deviceId) {
    const step = { key: 'POST /sync/status', url: '/sync/status', body: { companyId, deviceId } }
    const { summary } = await call(step)
    ;(grouped[step.key] ??= []).push(summary)
    console.log(`  ✓ POST /sync/status con el dispositivo de /sync/devices → ${summary.estado}`)
  }

  for (const [key, entries] of Object.entries(grouped)) {
    if (!data[key]) continue
    data[key].respuestaReal = { ...(data[key].respuestaReal || {}), barrido: entries }
  }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
  const conDatos = Object.entries(grouped).map(([k, e]) => `${k}: ${e.filter((x) => x.filas > 0).length} de ${e.length} combinaciones devolvieron filas`)
  console.log('\n' + conDatos.join('\n'))
  console.log(`\nGuardado en ${path.relative(process.cwd(), OUT)} (sin token y con datos personales enmascarados). Pásame ese archivo.`)
}

// ---------- comando: reproducir (fase 3c) ----------
// Repite contra la API real las peticiones de LECTURA que arman los services de la app (datos/cuerpos-app.json, generado sin red a partir del código de la app)
// y comprueba que cada una responde 200 con success true. Así se valida que la app consume bien, no solo que el endpoint existe.
// No repite las de escritura ni la de carritos (necesita un uuid real). Guarda el resultado en el mismo archivo (campo "resultado").
const APP_REQUESTS = path.join(HERE, 'datos', 'cuerpos-app.json')
const runReproducir = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const delay = Number(process.env.DELAY_MS) || 400
  const swap = { companyId: Number(process.env.COMPANY_ID) || null, warehouseId: Number(process.env.WAREHOUSE_ID) || null, userId: Number(process.env.USER_ID) || null }

  if (!fs.existsSync(APP_REQUESTS)) return console.log('Falta datos/cuerpos-app.json (se genera desde el código de la app con una prueba temporal)')
  if (enviar && !token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)')
  const file = JSON.parse(fs.readFileSync(APP_REQUESTS, 'utf8'))
  const adjust = (value) => {
    if (!value || typeof value !== 'object') return value
    const copy = Array.isArray(value) ? [...value] : { ...value }
    for (const key of Object.keys(copy)) if (swap[key] && Number.isInteger(copy[key])) copy[key] = swap[key]
    return copy
  }
  const todo = file.lecturas.filter((x) => !/^shop\.fetchCartItems/.test(x.servicio))
  if (!enviar) {
    console.log(`PLAN (no se envía nada; agrega --enviar): ${todo.length} peticiones de lectura, tal como las arma la app\n`)
    for (const x of todo) console.log(`  · ${x.servicio.padEnd(44)} ${x.metodo.padEnd(4)} ${x.ruta}  ${JSON.stringify(adjust(x.cuerpo ?? x.params) ?? '')}`)
    return
  }

  let consecutive401 = 0
  for (const x of todo) {
    const body = adjust(x.cuerpo)
    const params = adjust(x.params)
    const ruta = x.ruta.replace(/\/users\/\d+$/, (m) => (swap.userId ? `/users/${swap.userId}` : m))
    const url = API_BASE + ruta + (params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : '')
    const t0 = Date.now()
    let status = 0, text = '', failure = null
    try {
      const res = await fetch(url, { method: x.metodo, headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: x.metodo === 'GET' ? undefined : JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20000) })
      status = res.status
      text = await res.text()
    } catch (error) {
      failure = error.message
    }
    let json = null
    try { json = JSON.parse(text) } catch { /* no es JSON */ }
    const payload = json?.data
    const filas = Array.isArray(payload) ? payload.length : payload && typeof payload === 'object' ? 1 : 0
    const correcto = status >= 200 && status < 300 && json?.success !== false
    x.resultado = { fecha: new Date().toISOString(), estado: status || null, ms: Date.now() - t0, correcto, filas, mensaje: typeof json?.message === 'string' ? json.message.slice(0, 100) : undefined, error: typeof json?.error === 'string' ? json.error.slice(0, 140) : undefined, fallo: failure || undefined }
    console.log(`  ${correcto ? '✓' : '✗'} ${x.servicio.padEnd(44)} ${status || 'sin respuesta'} · ${filas} filas${correcto ? '' : ' · ' + (x.resultado.error || x.resultado.mensaje || failure || '')}`)
    consecutive401 = status === 401 ? consecutive401 + 1 : 0
    if (consecutive401 >= 3) { console.log('\nTres 401 seguidos: el token no sirve o venció. Se detiene.'); break }
    if (status === 429) { console.log('\n429: demasiadas peticiones. Se detiene; sube DELAY_MS.'); break }
    await new Promise((r) => setTimeout(r, delay))
  }
  fs.writeFileSync(APP_REQUESTS, JSON.stringify(file, null, 2))
  const hechas = todo.filter((x) => x.resultado)
  console.log(`\n${hechas.filter((x) => x.resultado.correcto).length} de ${hechas.length} responden bien.`)
  console.log(`Guardado en ${path.relative(process.cwd(), APP_REQUESTS)} (sin token). Pásame ese archivo.`)
}

// ---------- herramientas comunes de las fases 3d y 3e ----------
// llamada de solo lectura con el token del usuario; devuelve { status, json } y nunca guarda el token
const leer = async (token, url, body) => {
  try {
    const res = await fetch(API_BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* no es JSON */ }
    return { status: res.status, json }
  } catch (error) {
    return { status: 0, json: null, fallo: error.message }
  }
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- comando: niveles (fase 3d) ----------
// Deduce qué nivel de precio (P0, P1, P2...) corresponde a cada priceType del cliente (majority, corporate...) con VENTAS REALES:
// de cada venta toma el priceType del cliente y compara el precio cobrado en cada línea con la lista de precios del producto (ordenada por productPriceId).
// Solo lectura: POST /wallet/history (ids de ventas) y POST /management/saleId (detalle). Guarda solo conteos agregados, ningún dato de personas.
const runNiveles = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const companyId = Number(process.env.COMPANY_ID) || null
  const warehouseId = Number(process.env.WAREHOUSE_ID) || null
  const delay = Number(process.env.DELAY_MS) || 400
  const maxVentas = Number(process.env.MAX_VENTAS) || 60
  if (!companyId || !warehouseId) return console.log('Faltan COMPANY_ID y WAREHOUSE_ID (por ejemplo COMPANY_ID=1 WAREHOUSE_ID=1)')
  if (!enviar) return console.log(`PLAN (no se envía nada; agrega --enviar): lee los ids de hasta ${maxVentas} ventas con POST /wallet/history y pide el detalle de cada una con POST /management/saleId (~${maxVentas + 2} consultas de lectura, ${delay} ms de pausa)`)
  if (!token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)')

  const ids = []
  for (let page = 1; ids.length < maxVentas && page <= 10; page += 1) {
    const r = await leer(token, '/wallet/history', { companyId, warehouseId, page, pageSize: 30 })
    if (r.status !== 200 || !Array.isArray(r.json?.data) || r.json.data.length === 0) { if (r.status !== 200) console.log(`  ✗ /wallet/history página ${page} → ${r.status || r.fallo}`); break }
    for (const row of r.json.data) if (Number.isInteger(row.saleId) && ids.length < maxVentas) ids.push(row.saleId)
    await pausa(delay)
  }
  console.log(`  ${ids.length} ventas para revisar`)

  const votos = {} // priceType -> { posición en la lista de precios: veces }
  const canales = {} // saleChannel -> priceType -> veces
  let lineas = 0, sinCoincidencia = 0, revisadas = 0
  for (const saleId of ids) {
    const r = await leer(token, '/management/saleId', { companyId, warehouseId, saleId })
    await pausa(delay)
    if (r.status === 401) { console.log('\n401: el token no sirve o venció. Se detiene.'); break }
    if (r.status === 429) { console.log('\n429: demasiadas peticiones. Se detiene; sube DELAY_MS.'); break }
    const sale = r.json?.data?.sale
    if (!sale) continue
    revisadas += 1
    const tipo = String(sale.customerInformation?.priceType || '(vacío)')
    ;((canales[sale.saleChannel || '(vacío)'] ??= {})[tipo] = (canales[sale.saleChannel || '(vacío)'][tipo] || 0) + 1)
    for (const item of sale.saleItems || []) {
      const lista = [...(item.itemInformation?.prices || [])].sort((a, b) => a.productPriceId - b.productPriceId).map((x) => x.price)
      if (!lista.length || !Number.isFinite(item.price)) continue
      lineas += 1
      const pos = lista.findIndex((x) => x === item.price)
      if (pos < 0) { sinCoincidencia += 1; continue }
      // si dos niveles valen lo mismo no se puede saber cuál es: la línea no vota
      if (lista.filter((x) => x === item.price).length > 1) continue
      ;((votos[tipo] ??= {})[pos] = (votos[tipo][pos] || 0) + 1)
    }
  }

  console.log(`\nRevisé ${revisadas} ventas y ${lineas} líneas (${sinCoincidencia} con un precio que no está en la lista del producto: descuento o precio manual).\n`)
  const resultado = {}
  for (const [tipo, conteo] of Object.entries(votos)) {
    const total = Object.values(conteo).reduce((a, b) => a + b, 0)
    const [mejor, veces] = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]
    resultado[tipo] = { lineasQueVotan: total, posicionMasFrecuente: Number(mejor), porcentaje: Math.round((veces / total) * 100), reparto: conteo }
    console.log(`  ${tipo.padEnd(12)} → posición ${mejor} de la lista de precios (P${mejor}) en ${Math.round((veces / total) * 100)}% de ${total} líneas  ${JSON.stringify(conteo)}`)
  }
  if (!Object.keys(resultado).length) console.log('  Ninguna línea permitió deducir el nivel (ver los datos de arriba).')
  console.log('\nCanal de venta vs priceType del cliente:', JSON.stringify(canales))

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  if (data['POST /management/saleId']) data['POST /management/saleId'].respuestaReal = { ...(data['POST /management/saleId'].respuestaReal || {}), niveles: { fecha: new Date().toISOString(), ventasRevisadas: revisadas, lineas, sinCoincidencia, porPriceType: resultado, canalVsPriceType: canales } }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
  console.log(`\nGuardado en ${path.relative(process.cwd(), OUT)} (solo conteos). Pásame ese archivo.`)
}

// ---------- comando: vendedores (fase 3e) ----------
// Busca QUIÉN tiene datos para probar: pedidos pendientes (POST /sales/pendings, por vendedor y bodega) y cotizaciones (POST /quotations, por vendedor).
// Solo lectura. Toma los vendedores de POST /employees y sus bodegas. Guarda userId y conteos (sin nombres ni datos personales).
const runVendedores = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const companyId = Number(process.env.COMPANY_ID) || null
  const delay = Number(process.env.DELAY_MS) || 400
  if (!companyId) return console.log('Falta COMPANY_ID (por ejemplo COMPANY_ID=1)')
  if (!enviar) return console.log('PLAN (no se envía nada; agrega --enviar): lee los empleados con POST /employees y, por cada uno, consulta sus pedidos pendientes en cada una de sus bodegas y sus cotizaciones (~2 consultas de lectura por empleado, ' + delay + ' ms de pausa)')
  if (!token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)')

  const lista = await leer(token, '/employees', { companyId })
  if (lista.status !== 200 || !Array.isArray(lista.json?.data)) return console.log(`✗ /employees → ${lista.status || lista.fallo}`)
  const empleados = lista.json.data.filter((e) => Number.isInteger(e.userId))
  console.log(`  ${empleados.length} empleados\n`)

  const filas = []
  let stop = null
  for (const e of empleados) {
    if (stop) break
    const bodegas = [...new Set((e.branches || []).map((b) => b.branchId).filter(Number.isInteger))]
    const pendientes = {}
    for (const wh of bodegas.length ? bodegas : [Number(process.env.WAREHOUSE_ID) || 1]) {
      const r = await leer(token, '/sales/pendings', { userId: e.userId, warehouseId: wh, page: 1, pageSize: 1 })
      await pausa(delay)
      if (r.status === 401 || r.status === 429) { stop = `${r.status}: se detiene (${r.status === 401 ? 'el token no sirve o venció' : 'demasiadas peticiones; sube DELAY_MS'}).`; break }
      pendientes[wh] = r.json?.meta?.totalRecords ?? (Array.isArray(r.json?.data) ? r.json.data.length : 0)
    }
    const q = await leer(token, '/quotations', { companyId, sellerId: e.userId, userId: e.userId, page: 1, pageSize: 1 })
    await pausa(delay)
    const cotizaciones = q.json?.data?.totalRows ?? 0
    const totalPend = Object.values(pendientes).reduce((a, b) => a + b, 0)
    filas.push({ userId: e.userId, employeeId: e.employeeId, bodegas, pendientesPorBodega: pendientes, cotizaciones })
    if (totalPend > 0 || cotizaciones > 0) console.log(`  ✓ userId ${String(e.userId).padEnd(6)} pendientes ${JSON.stringify(pendientes)} · cotizaciones ${cotizaciones}`)
  }
  const conDatos = filas.filter((f) => f.cotizaciones > 0 || Object.values(f.pendientesPorBodega).some((n) => n > 0))
  console.log(`\n${conDatos.length} de ${filas.length} empleados tienen pedidos pendientes o cotizaciones.`)
  if (conDatos[0]) console.log(`Para sondear con uno de ellos:  $env:USER_ID="${conDatos[0].userId}"; $env:WAREHOUSE_ID="${conDatos[0].bodegas[0] ?? 1}"; node sonda.mjs sondear --enviar`)
  if (stop) console.log('\n' + stop)

  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  if (data['POST /sales/pendings']) data['POST /sales/pendings'].respuestaReal = { ...(data['POST /sales/pendings'].respuestaReal || {}), vendedores: filas }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
  console.log(`\nGuardado en ${path.relative(process.cwd(), OUT)} (solo ids y conteos). Pásame ese archivo.`)
}

// ---------- comando: cotizaciones (fase 3f) ----------
// GET /quotations/stats dice que hay cotizaciones, pero POST /quotations devolvió 0 filas porque las pruebas enviaban sellerId y userId a la vez (se aplican juntos).
// Aquí se prueba la lista SIN filtros de persona y con cada estado, y se guarda una muestra enmascarada. Solo lectura.
const runCotizaciones = async () => {
  const enviar = process.argv.includes('--enviar')
  const token = process.env.API_TOKEN || ''
  const companyId = Number(process.env.COMPANY_ID) || null
  const delay = Number(process.env.DELAY_MS) || 400
  const estados = (process.env.ESTADOS_COT || 'draft,sent,accepted,rejected,expired,converted').split(',').map((s) => s.trim()).filter(Boolean)
  if (!companyId) return console.log('Falta COMPANY_ID (por ejemplo COMPANY_ID=1)')
  const plan = [{ companyId, page: 1, pageSize: 10 }, ...estados.map((status) => ({ companyId, page: 1, pageSize: 10, status }))]
  if (!enviar) return console.log(`PLAN (no se envía nada; agrega --enviar): ${plan.length} consultas de lectura a POST /quotations (sin filtro de persona y con cada estado: ${estados.join(', ')})`)
  if (!token) return console.log('Falta API_TOKEN. En tu terminal:  $env:API_TOKEN="tu_token"  (PowerShell)')

  const filas = []
  for (const body of plan) {
    const r = await leer(token, '/quotations', body)
    const lista = r.json?.data?.data
    const resumen = { cuerpo: body, estado: r.status || null, filas: Array.isArray(lista) ? lista.length : 0, total: r.json?.data?.totalRows, mensaje: typeof r.json?.message === 'string' ? r.json.message.slice(0, 100) : undefined, error: typeof r.json?.error === 'string' ? r.json.error.slice(0, 120) : undefined, muestra: Array.isArray(lista) && lista.length ? maskTrim(lista.slice(0, 2)) : undefined }
    filas.push(resumen)
    console.log(`  ${r.status === 200 ? '✓' : '✗'} ${JSON.stringify(body.status ? { status: body.status } : 'sin filtros').padEnd(24)} → ${r.status || r.fallo} · ${resumen.filas} filas${resumen.total !== undefined ? ` (total ${resumen.total})` : ''}`)
    if (r.status === 401 || r.status === 429) { console.log(`\n${r.status}: se detiene.`); break }
    await pausa(delay)
  }
  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  if (data['POST /quotations']) data['POST /quotations'].respuestaReal = { ...(data['POST /quotations'].respuestaReal || {}), barrido: filas }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
  console.log(`\nGuardado en ${path.relative(process.cwd(), OUT)} (muestra enmascarada). Pásame ese archivo.`)
}

const cmd = process.argv[2]
if (cmd === 'config') runConfig()
else if (cmd === 'inventario') runInventario()
else if (cmd === 'sondear') await runSondear()
else if (cmd === 'barrido') await runBarrido()
else if (cmd === 'reproducir') await runReproducir()
else if (cmd === 'niveles') await runNiveles()
else if (cmd === 'vendedores') await runVendedores()
else if (cmd === 'cotizaciones') await runCotizaciones()
else console.log('uso: node sonda.mjs config | inventario | sondear [--enviar] | barrido [--enviar] | reproducir [--enviar] | niveles [--enviar] | vendedores [--enviar] | cotizaciones [--enviar]')
