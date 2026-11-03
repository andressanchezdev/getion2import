// SuppliersScreen · pantalla de proveedores: la tabla de externos filtrada por tipo «supplier»
// conecta con: screenRegistry (la monta) y ExternalsTable (tabla, alta y baja)
import React from 'react'
import { ExternalsTable } from '../components/ExternalsTable'

export const SuppliersScreen: React.FC = () => {
  return <ExternalsTable kind="supplier" />
}
export default SuppliersScreen

