// CreditAccountEmpty · mensaje del panel cuando no hay ningún cliente seleccionado
// conecta con: CreditAccountDrawer (se muestra mientras selectedCustomerId es null)
import React from 'react'
import walletIcon from '@/assets/icons/wallet.svg'
import './CreditAccountEmpty.css'

export const CreditAccountEmpty: React.FC = () => {
  return (
    <div className="credit-drawer-empty">
      <img src={walletIcon} alt="" className="credit-drawer-empty-icon" />
      <p className="credit-drawer-empty-text">Ningún cliente seleccionado</p>
      <span className="credit-drawer-empty-hint">
        Haz clic en cualquier cliente de la tabla para ver su estado de cuenta y registrar pagos.
      </span>
    </div>
  )
}

export default CreditAccountEmpty
