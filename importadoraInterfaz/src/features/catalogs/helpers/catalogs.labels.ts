// catalogs.labels · textos en español de los catálogos (nombre en singular y ejemplo del campo nombre)
// conecta con: CatalogTable, CatalogItemFormPanel y useCatalogItemForm (los usan)
import type { CatalogType } from '../types/catalogs.types'

// «marcas» → «Marca», «categorías» → «Categoría», «modelos» → «Modelo» (otro plural: le quita la última letra)
export const singularOf = (noun: string): string => {
  if (noun === 'marcas') return 'Marca'
  if (noun === 'categorías') return 'Categoría'
  if (noun === 'modelos') return 'Modelo'
  return noun.slice(0, -1)
}

// ejemplo que se muestra en el campo nombre de cada catálogo
export const nameExample = (type: CatalogType): string => (type === 'brand' ? 'Yamaha' : type === 'category' ? 'Frenos' : 'Pulsar NS 200')
