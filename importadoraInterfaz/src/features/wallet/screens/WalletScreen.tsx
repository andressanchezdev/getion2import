// WalletScreen · pantalla del módulo Cartera: Créditos, Abonos y Conciliación Entradas (esta última vive en la feature bank)
// conecta con: CreditClientsTable, AbonosTable, BankReconciliationScreen y useWalletLoader; la monta MainContent
import React from 'react'
import './WalletScreen.css'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { CreditClientsTable } from '../components/clientsTable/CreditClientsTable'
import { AbonosTable } from '../components/paymentsTable/AbonosTable'
import { BankReconciliationScreen } from '@/features/bank'
import { useWalletLoader } from '../hooks/useWalletLoader'

export const WalletScreen: React.FC = () => {
  const activeSubitem = useAppSelector((state) => state.ui.activeSubitem)

  // La cartera se carga en la vista de créditos
  useWalletLoader()

  return (
    <div className="wallet-screen">
      {activeSubitem === 'paymentVerification' ? (
        <AbonosTable />
      ) : activeSubitem === 'bankReconciliation' ? (
        <BankReconciliationScreen />
      ) : (
        <CreditClientsTable />
      )}
    </div>
  )
}

export default WalletScreen
