// externals.constants · estado inicial, tamaño de carga, textos por tipo y opciones de filtro de proveedores y transportadoras
// conecta con: externals.slice (initialState), externals.service (tamaño de carga), los hooks y los componentes (textos)
import type { ExternalKind, ExternalsState, ExternalStatusFilter } from '../types/externals.types'

// la API entrega hasta 200 por página; se piden de una vez y la tabla los pagina en pantalla de 20 en 20
export const EXTERNALS_LOAD_SIZE = 200

export const INITIAL_EXTERNALS_STATE: ExternalsState = { kind: null, items: [], status: 'idle', error: null, saving: false, requestId: null }

export const EXTERNAL_STATUS_OPTIONS: Array<{ value: ExternalStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Solo activos' },
  { value: 'inactive', label: 'Solo inactivos' },
]

// cómo se llama cada tipo en la pantalla
export const EXTERNAL_LABELS: Record<'supplier' | 'carrier', { singular: string; plural: string; article: string; searchHint: string }> = {
  supplier: { singular: 'Proveedor', plural: 'proveedores', article: 'el proveedor', searchHint: 'Buscar por razón social, NIT, contacto o ciudad...' },
  carrier: { singular: 'Transportadora', plural: 'transportadoras', article: 'la transportadora', searchHint: 'Buscar por nombre, NIT, contacto o ciudad...' },
}

// el rótulo de un tipo (los de «otro» se tratan como proveedores)
export const labelsOf = (kind: ExternalKind) => EXTERNAL_LABELS[kind === 'carrier' ? 'carrier' : 'supplier']
