// formEntry.types · forma de cada entrada del registro de formularios del panel derecho: ícono, título, subtítulo y qué se pinta
// conecta con: las entradas de entries/ y formRegistry (las junta)
import type { ReactNode } from 'react'

export interface FormEntry {
  icon: string
  title: (payload: unknown) => string
  subtitle?: string
  wide?: boolean // true: el panel se abre más ancho (listas y tablas)
  permission?: string[] // llaves «modulo:accion» de la API; basta una. Sin ninguna, FormDrawerBody muestra «Sin acceso» (8.4)
  render: (payload: unknown) => ReactNode
}
