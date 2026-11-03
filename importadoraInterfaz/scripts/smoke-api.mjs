// smoke-api · recorre el ciclo completo de un pedido contra el API Go real: entrar, crear el pedido en efectivo, cobrarlo, alistar, empacar, facturar, despachar y enviar, y comprueba que repetir una etapa se rechaza
// uso: SMOKE_EMAIL=correo SMOKE_PASSWORD=clave node scripts/smoke-api.mjs   (opcionales: API_URL=http://localhost:3001, SMOKE_WAREHOUSE=1, SMOKE_METHOD=cash|transfer|credit)
// ojo: CREA DATOS REALES (un pedido, su pago y su factura y descuenta stock) en la base a la que apunte API_URL; úsalo con la base de pruebas, no con producción
// ojo: la bodega elegida necesita facturación configurada (la trae la semilla) y el usuario, permisos de pedidos, pagos y caja
const API = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')
const EMAIL = process.env.SMOKE_EMAIL
const PASSWORD = process.env.SMOKE_PASSWORD
const WAREHOUSE = Number(process.env.SMOKE_WAREHOUSE || 1)
const METHOD = process.env.SMOKE_METHOD || 'cash' // cash | transfer | credit

if (!EMAIL || !PASSWORD) {
  console.error('Faltan SMOKE_EMAIL y SMOKE_PASSWORD.')
  process.exit(2)
}

let token = ''
const results = []

const call = async (method, path, body) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* respuesta que no es JSON (por ejemplo una página de error del proxy) */ }
  return { status: res.status, json, text }
}

// registra un paso: ok si el estado HTTP es el esperado
const step = async (name, run, expectStatus = [200, 201]) => {
  try {
    const res = await run()
    const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus]
    const ok = expected.includes(res.status)
    const detail = ok ? '' : ` → ${res.status} ${res.json?.message || res.json?.error?.message || res.text.slice(0, 160)}`
    results.push({ name, ok })
    console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail}`)
    return ok ? res : null
  } catch (error) {
    results.push({ name, ok: false })
    console.log(`FALLA ${name} → ${error.message} (¿el API está corriendo en ${API}?)`)
    return null
  }
}

const data = (res) => res?.json?.data
const stageOf = async (saleId) => data(await call('GET', `/sales/${saleId}`))?.currentStage

const login = await step('Iniciar sesión', () => call('POST', '/auth/login', { email: EMAIL, password: PASSWORD, device: 'smoke' }))
if (!login) process.exit(1)
token = data(login)?.accessToken || data(login)?.access_token || ''
if (!token) { console.log('FALLA No llegó el token de acceso'); process.exit(1) }

const stockRes = await step('Listar el stock de la bodega', () => call('GET', `/stock?warehouseId=${WAREHOUSE}&page=1&pageSize=200`))
const row = (data(stockRes) || []).find((r) => Number(r.sellable) >= 3)
if (!row) { console.log('FALLA No hay un producto con 3 o más unidades vendibles en la bodega'); process.exit(1) }

const customersRes = await step('Listar clientes', () => call('GET', '/customers?page=1&pageSize=5'))
const customerId = (data(customersRes) || [])[0]?.id
if (!customerId) { console.log('FALLA No hay clientes'); process.exit(1) }

const sellersRes = await step('Listar vendedores', () => call('GET', '/employees/salespersons'))
const salespersonEmployeeId = (data(sellersRes) || [])[0]?.id ?? (data(sellersRes) || [])[0]?.employeeId

const active = await call('GET', `/cash/sessions/active?warehouseId=${WAREHOUSE}`)
if (!data(active)) await step('Abrir el turno de caja', () => call('POST', '/cash/sessions/open', { warehouseId: WAREHOUSE, openingAmount: 100000 }))

const created = await step(`Crear el pedido (${METHOD})`, () =>
  call('POST', '/sales', {
    warehouseId: WAREHOUSE,
    customerId,
    salespersonEmployeeId,
    paymentMethod: METHOD,
    paymentCondition: METHOD === 'credit' ? 'credit' : 'cash',
    items: [{ stockId: row.stockId, quantity: 1 }],
  })
)
const sale = data(created)
if (!sale?.id) { console.log('No se creó el pedido: se detiene aquí.'); process.exit(1) }
console.log(`      pedido ${sale.serialCode}: total ${sale.total} (IVA ${sale.ivaTotal})`)

if (METHOD === 'cash') await step('Cobrar el pedido (efectivo)', () => call('POST', '/payments/batch', { saleId: sale.id, payments: [{ method: 'cash', amount: Number(sale.total) }] }))
const afterPay = await stageOf(sale.id)
if (METHOD !== 'cash') { console.log(`      etapa tras crear (${METHOD}): ${afterPay}`); if (afterPay !== 'verification_ok') { console.log('      el pedido queda esperando verificación del pago; se detiene aquí.'); process.exit(0) } }
results.push({ name: 'El pago deja el pedido en verification_ok', ok: afterPay === 'verification_ok' })
console.log(`${afterPay === 'verification_ok' ? 'OK   ' : 'FALLA'} El pago deja el pedido en verification_ok (etapa: ${afterPay})`)

for (const action of ['pick', 'pack', 'invoice', 'dispatch', 'send']) {
  await step(`Etapa: ${action}`, () => call('POST', `/sales/${sale.id}/${action}`, {}))
}
const finalStage = await stageOf(sale.id)
results.push({ name: 'El pedido termina enviado', ok: finalStage === 'sent' })
console.log(`${finalStage === 'sent' ? 'OK   ' : 'FALLA'} El pedido termina enviado (etapa: ${finalStage})`)

await step('Repetir despacho se rechaza (409)', () => call('POST', `/sales/${sale.id}/dispatch`, {}), 409)
await step('Reporte general responde', () => call('GET', '/reports/general'))

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed} de ${results.length} pasos bien${failed ? `, ${failed} con falla` : ''}`)
process.exit(failed ? 1 : 0)
