// WalletScreen · pantalla de cartera: módulo único integrado con KPIs y tabla de clientes
// conecta con: CreditClientsTable, useWalletLoader (pide la cartera); la monta MainContent
import React from 'react'
import './WalletScreen.css'
import { CreditClientsTable } from '../components/clientsTable/CreditClientsTable'
import { useWalletLoader } from '../hooks/useWalletLoader'

export const WalletScreen: React.FC = () => {
  // ojo: la lista y los totales se piden al backend al abrir la pantalla y al cambiar página o bodega
  useWalletLoader()

  return (
    <div className="wallet-screen">
      <CreditClientsTable />
    </div>
  )
}

export default WalletScreen
