// check-typography · avisa de tipografía suelta: tamaños, pesos, interlineados o fuentes escritos a mano fuera de tokens.css
// uso: npm run check:type  (termina con error si encuentra algo, para usarlo antes de entregar cambios)
// ojo: no revisa global2/ ni features2/ (carpetas reservadas) ni styles/tokens.css (ahí sí van los valores)
import fs from 'node:fs'
import path from 'node:path'

const PROPS = ['font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing']
// valores permitidos sin token: herencia, normal y los interlineados 0 y 1
const ALLOWED = new Set(['inherit', 'normal', '1', '0', 'initial', 'unset'])

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return /^(global2|features2|node_modules)$/.test(entry.name) ? [] : walk(path.join(dir, entry.name))
    return [path.join(dir, entry.name)]
  })

const files = walk('src').filter((file) => file.endsWith('.css') && !file.endsWith('tokens.css'))
const problems = []

for (const file of files) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const text = line.trim()
    const prop = PROPS.find((name) => text.startsWith(name + ':'))
    if (!prop) return
    const value = text.slice(prop.length + 1).replace(';', '').trim()
    if (ALLOWED.has(value)) return
    // con token: debe ser var(--x) sin valor de respaldo escrito a mano
    const isToken = value.startsWith('var(--') && !/var\(--[a-z0-9-]+,\s*[0-9]/.test(value)
    if (!isToken) problems.push(`${file.split(path.sep).join('/')}:${index + 1}  ${prop}: ${value}`)
  })
}

if (problems.length) {
  console.log(`Tipografía suelta (${problems.length}):\n` + problems.join('\n'))
  process.exit(1)
}
console.log(`Tipografía OK: ${files.length} archivos CSS sin valores sueltos.`)
