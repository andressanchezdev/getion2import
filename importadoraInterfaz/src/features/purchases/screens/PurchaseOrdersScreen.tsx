// PurchaseOrdersScreen · Gestión Compras > Órdenes de Compra: todas las órdenes de la bodega activa, con búsqueda, estado, crear, ver, recibir, bajar el Excel y anular
// conecta con: PurchasesTable (la tarjeta con la barra y la tabla); la monta MainContent (screenRegistry)
import React from 'react'
import { PurchasesTable } from '../components/table/PurchasesTable'

export const PurchaseOrdersScreen: React.FC = () => <PurchasesTable mode="orders" />

export default PurchaseOrdersScreen
