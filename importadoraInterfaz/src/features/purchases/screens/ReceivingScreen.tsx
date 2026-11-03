// ReceivingScreen · Gestión Compras > Recepción en Bodega: solo las órdenes que esperan mercancía, con la acción de recibir por producto y ubicación
// conecta con: PurchasesTable en modo «recepción»; la monta MainContent (screenRegistry)
import React from 'react'
import { PurchasesTable } from '../components/table/PurchasesTable'

export const ReceivingScreen: React.FC = () => <PurchasesTable mode="receiving" />

export default ReceivingScreen
