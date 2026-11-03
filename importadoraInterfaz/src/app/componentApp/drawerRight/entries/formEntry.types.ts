// formEntry.types · forma de cada entrada del registro de formularios del panel derecho: ícono, título, subtítulo y qué se pinta
// conecta con: las entradas de entries/ y formRegistry (las junta)
import type { ReactNode } from 'react'

export interface FormEntry {
  icon: string
  title: (payload: unknown) => string
  subtitle?: string
  render: (payload: unknown) => ReactNode
}
