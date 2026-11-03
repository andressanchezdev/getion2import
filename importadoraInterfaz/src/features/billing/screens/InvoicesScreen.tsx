// InvoicesScreen · Gestión Ventas > Facturas: las facturas emitidas de la bodega activa, con búsqueda y estado
// conecta con: InvoicesTable (la tarjeta con la barra y la tabla); la monta MainContent (screenRegistry)
import React from 'react'
import { InvoicesTable } from '../components/table/InvoicesTable'

export const InvoicesScreen: React.FC = () => <InvoicesTable />

export default InvoicesScreen
