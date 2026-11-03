// check-endpoints · revisa que cada ruta de src/api/config.ts y de src/api/endpoints/* exista en el Swagger del backend
// uso: npm run check:api  (por defecto lee importadoraApi/docs/swagger.json si existe localmente, o argumento de línea de comandos, o Swagger público)
// ojo: solo lee; termina con error si una ruta de config.ts no existe
import fs from 'node:fs'
import path from 'node:path'

const LOCAL_SWAGGER = path.resolve('../importadoraApi/docs/swagger.json')
const SWAGGER_URL = 'https://importadora-back-production.up.railway.app/swagger/doc.json'
const source = process.argv[2] || (fs.existsSync(LOCAL_SWAGGER) ? LOCAL_SWAGGER : null)

const swagger = source ? JSON.parse(fs.readFileSync(source, 'utf8')) : await (await fetch(SWAGGER_URL)).json()
const paths = Object.keys(swagger.paths)

// busca todas las rutas escritas entre comillas o plantillas en config.ts y en endpoints/*
const endpointFiles = fs.readdirSync('src/api/endpoints').filter((file) => file.endsWith('.ts')).map((file) => `src/api/endpoints/${file}`)
const config = ['src/api/config.ts', ...endpointFiles].map((file) => fs.readFileSync(file, 'utf8')).join(String.fromCharCode(10))

// Extraer rutas y normalizar parámetros: ${var} -> {var}
const rawFound = [...config.matchAll(/['`](\/[A-Za-z0-9/_${}.-]+)['`]/g)].map((m) => m[1])

const expanded = []
for (const r of rawFound) {
  // Manejar acciones dinámicas de ventas (/sales/${id}/${action})
  if (r.includes('${action}')) {
    const actions = ['verify', 'verify-payment', 'pick', 'pack', 'invoice', 'dispatch', 'send', 'cancel']
    for (const act of actions) {
      expanded.push(r.replace('${id}', '{id}').replace('${action}', act))
    }
  } else {
    // Reemplazar ${param} por {param}
    expanded.push(r.replace(/\$\{([a-zA-Z0-9_]+)\}/g, '{$1}'))
  }
}

const unique = [...new Set(expanded)].filter((route) => route !== '/swagger/doc.json') // el Swagger mismo no es una ruta de la API
const missing = unique.filter((route) => !paths.includes(route))

if (missing.length) {
  console.log(`Rutas de endpoints que NO existen en el Swagger (${missing.length}):\n` + missing.join('\n'))
  process.exit(1)
}
console.log(`Rutas OK: ${unique.length} de config.ts y endpoints/* existen en el Swagger (${paths.length} rutas en total).`)
