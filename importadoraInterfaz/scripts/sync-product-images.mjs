// sync-product-images · busca en el bucket público del sistema anterior la primera imagen de cada producto y arma el mapa código -> ruta
// uso: node scripts/sync-product-images.mjs codigos.txt   (un código de producto por línea; escribe src/features/shop/constants/legacyProductImages.ts)
// ojo: solo lee del bucket (listado público); en el bucket cada producto tiene una carpeta con su código: dependencias/img/productos/<código>/<código>-<NOMBRE> -1.webp
// ojo: el nombre del archivo cambia de un producto a otro (con o sin espacio antes del número), por eso se lista la carpeta en vez de armar el nombre
import fs from 'node:fs'

const BUCKET = 'importadorapremiumonline'
const ROOT = 'dependencias/img/productos/'
const OUT = 'src/features/shop/constants/legacyProductImages.ts'

const source = process.argv[2]
if (!source) {
  console.error('Falta el archivo con los códigos: node scripts/sync-product-images.mjs codigos.txt')
  process.exit(1)
}
const codes = [...new Set(fs.readFileSync(source, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean))]

// la imagen principal es la de menor número (…-1.webp); se ordena por nombre y se toma la primera que sea imagen
const firstImage = async (folder) => {
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=${encodeURIComponent(`${ROOT}${folder}/`)}&fields=items(name)&maxResults=20`
  const res = await fetch(url)
  if (!res.ok) return null
  const { items = [] } = await res.json()
  const names = items.map((item) => item.name).filter((name) => /\.(webp|jpe?g|png)$/i.test(name)).sort()
  return names[0] ?? null
}

const map = {}
for (const code of codes) {
  // la carpeta lleva el código igual; si no existe se prueba sin el sufijo «-N»
  const found = (await firstImage(code)) ?? (code.includes('-') ? await firstImage(code.slice(0, code.lastIndexOf('-'))) : null)
  if (found) map[code] = found
}

const lines = Object.entries(map).map(([code, path]) => `  ${JSON.stringify(code)}: ${JSON.stringify(path)},`)
fs.writeFileSync(
  OUT,
  `// legacyProductImages · imagen principal de cada producto en el bucket del sistema anterior (código -> ruta dentro del bucket)\n// conecta con: shop.adapter (si el producto no trae imagen de la API usa esta) y getStorageUrl (le pone la dirección del bucket)\n// ojo: GENERADO por scripts/sync-product-images.mjs; para productos nuevos se vuelve a correr el script, no se edita a mano\nexport const LEGACY_PRODUCT_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n}\n`,
)
console.log(`${Object.keys(map).length} de ${codes.length} productos con imagen en el bucket -> ${OUT}`)
