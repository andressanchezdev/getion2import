// CashExpensesScreen · Gestión Ventas > Facturas: todo lo que pagan las cajas de todas las bodegas (recepciones de compra y gastos), una vez cierran
// conecta con: CashExpensesTable (la tarjeta con la barra y la tabla); la monta MainContent (screenRegistry)
import React from 'react'
import { CashExpensesTable } from '../components/CashExpensesTable'

export const CashExpensesScreen: React.FC = () => <CashExpensesTable />

export default CashExpensesScreen
