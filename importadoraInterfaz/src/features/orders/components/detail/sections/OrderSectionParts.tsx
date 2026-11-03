// OrderSectionParts · piezas compartidas por las cajas del detalle de un pedido: fila, caja con título y etiqueta de sí o no
// conecta con: OrderSummarySection, OrderPeopleSection, OrderLinesSection, OrderPaymentsSection y OrderTransferProof; global Pill; sus estilos están en OrderSections.css
import React from 'react'
import { Pill } from '@/global/components/UI/atoms/Pill'
import './OrderSections.css'

// fila con el nombre a la izquierda y el valor a la derecha
export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="order-section-row">
    <span>{label}</span>
    <b>{children}</b>
  </div>
)

// caja con título que agrupa una parte del detalle del pedido
export const Box: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="order-section">
    <h5 className="order-section-title">{title}</h5>
    {children}
  </section>
)

// etiqueta verde si es sí y gris si es no
export const YesNoPill: React.FC<{ ok: boolean; yes: string; no: string }> = ({ ok, yes, no }) => <Pill tone={ok ? 'green' : 'gray'}>{ok ? yes : no}</Pill>
