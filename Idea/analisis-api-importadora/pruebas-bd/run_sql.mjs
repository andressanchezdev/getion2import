// Ejecuta el script de la base de datos en un PostgreSQL real (PGlite = PostgreSQL compilado a WASM) y, si se da,
// un archivo de escenarios. Uso: node run_sql.mjs <script.sql> [escenarios.sql]
// En el archivo de escenarios, lo que va antes del primer "-- TEST:" se carga antes de cada escenario;
// "-- EXPECT-ERROR: texto" espera que la base rechace con ese texto y "-- EXPECT-ROWS: json" compara el último SELECT.
import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'

const [, , scriptPath, testsPath, onlyFilter] = process.argv
const db = new PGlite({ extensions: { citext, pg_trgm, pgcrypto } })
const ver = await db.query('select version() as v')
console.log('Motor:', ver.rows[0].v.split(',')[0])

const script = fs.readFileSync(scriptPath, 'utf8')
try {
  await db.exec(script)
  console.log('SCRIPT: OK, se ejecutó completo')
} catch (e) {
  console.log('SCRIPT: ERROR ->', e.message)
  if (e.position) {
    const pos = Number(e.position)
    console.log('   cerca de:', script.slice(Math.max(0, pos - 160), pos + 120).replace(/\n/g, '⏎'))
  }
  process.exit(1)
}

if (testsPath) {
  const raw = fs.readFileSync(testsPath, 'utf8')
  const parts = raw.split(/^-- TEST: /m)
  const prelude = parts[0]
  let ok = 0, bad = 0
  for (const b of parts.slice(1)) {
    const nl = b.indexOf('\n')
    const name = b.slice(0, nl).trim()
    if (onlyFilter && !name.startsWith(onlyFilter)) continue
    const body = b.slice(nl + 1)
    const expectErr = (body.match(/^-- EXPECT-ERROR: (.*)$/m) || [])[1]?.trim() ?? null
    const expectRows = (body.match(/^-- EXPECT-ROWS: (.*)$/m) || [])[1]?.trim() ?? null
    try {
      await db.exec('BEGIN;')
      const res = await db.exec(prelude + '\n' + body)
      const last = res[res.length - 1]
      await db.exec('ROLLBACK;')
      if (expectErr) { bad++; console.log(`  ✗ ${name}: debía fallar con «${expectErr}» pero pasó`) }
      else if (expectRows !== null) {
        const got = JSON.stringify(last?.rows ?? [])
        if (got === expectRows) { ok++; console.log(`  ✔ ${name}`) } else { bad++; console.log(`  ✗ ${name}\n      esperado ${expectRows}\n      llegó    ${got}`) }
      } else { ok++; console.log(`  ✔ ${name}`) }
    } catch (e) {
      try { await db.exec('ROLLBACK;') } catch {}
      if (expectErr && e.message.includes(expectErr)) { ok++; console.log(`  ✔ ${name}  (la base rechazó: ${e.message.slice(0, 80)})`) }
      else { bad++; console.log(`  ✗ ${name}: ${expectErr ? 'error distinto (esperaba «' + expectErr + '») -> ' : 'error inesperado -> '}${e.message}`) }
    }
  }
  console.log(`ESCENARIOS: ${ok} bien, ${bad} mal`)
  process.exit(bad ? 2 : 0)
}
