// CarriersScreen · pantalla de transportadoras: la tabla de externos filtrada por tipo «carrier»
// conecta con: screenRegistry (la monta) y ExternalsTable (tabla, alta y baja)
import React from 'react'
import { ExternalsTable } from '../components/ExternalsTable'

export const CarriersScreen: React.FC = () => {
  return <ExternalsTable kind="carrier" />
}
export default CarriersScreen

