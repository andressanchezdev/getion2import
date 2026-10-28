// CreditUsageBar · barra con el porcentaje de cupo usado (verde, ámbar o roja según el nivel)
// conecta con: CreditClientRow (le pasa el porcentaje); el nivel sale de wallet.helpers (getUsageLevel)
import React from 'react'
import { getUsageLevel } from '../../helpers/wallet.helpers'
import type { CreditUsageBarProps } from '../../types/wallet.table.types'
import './CreditUsageBar.css'

export const CreditUsageBar: React.FC<CreditUsageBarProps> = ({ percentage }) => {
  return (
    <div className="credit-table-usage-wrapper">
      <div className="credit-table-progress-bar">
        {/* ojo: el ancho es dinámico (depende del cliente), por eso es el único estilo en línea */}
        <div
          className={`credit-table-progress-fill credit-table-progress-${getUsageLevel(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="credit-table-usage-text">{percentage}%</span>
    </div>
  )
}

export default CreditUsageBar
