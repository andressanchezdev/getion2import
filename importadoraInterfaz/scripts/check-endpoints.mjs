// check-endpoints · revisa que cada ruta de src/api/config.ts exista en el Swagger del backend
// uso: npm run check:api  (descarga el Swagger público; con un archivo local: node scripts/check-endpoints.mjs ruta/swagger.json)
// ojo: solo lee; termina con error si una ruta de config.ts no existe o si cambió su método
import fs from 'node:fs'

const SWAGGER_URL = 'https://importadora-back-production.up.railway.app/swagger/doc.json'
const source = process.argv[2]

const swagger = source ? JSON.parse(fs.readFileSync(source, 'utf8')) : await (await fetch(SWAGGER_URL)).json()
const paths = Object.keys(swagger.paths)

// busca todas las rutas escritas entre comillas o plantillas en config.ts ('/users/${id}' se compara como /users/{id})
const config = fs.readFileSync('src/api/config.ts', 'utf8')
const found = [...config.matchAll(/['`](\/[A-Za-z0-9/_${}.-]+)['`]/g)].map((m) => m[1].replace('${id}', '{id}'))

const unique = [...new Set(found)].filter((route) => route !== '/swagger/doc.json') // el Swagger mismo no es una ruta de la API
const missing = unique.filter((route) => !paths.includes(route))

if (missing.length) {
  console.log(`Rutas de config.ts que NO existen en el Swagger (${missing.length}):\n` + missing.join('\n'))
  process.exit(1)
}
console.log(`Rutas OK: ${unique.length} de config.ts existen en el Swagger (${paths.length} rutas en total).`)
