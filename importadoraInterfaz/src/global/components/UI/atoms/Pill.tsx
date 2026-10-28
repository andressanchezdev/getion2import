// Pill · pastilla de estado del ERP (la .pill de la maqueta): texto corto con borde y fondo suave en ámbar, azul, verde, rojo o gris
// conecta con: Pill.css; la usan la tabla de pedidos y su detalle (etapa, pago, pausa); sirve para cualquier estado de otra pantalla
import React from 'react'
import './Pill.css'

export type PillTone = 'amber' | 'blue' | 'green' | 'red' | 'gray'

interface PillProps {
  tone?: PillTone
  children: React.ReactNode
}

export const Pill: React.FC<PillProps> = ({ tone = 'gray', children }) => {
  return <span className={`ui-pill ui-pill-${tone}`}>{children}</span>
}

export default Pill
