// CreditAccountMetrics · tarjetas del estado de cuenta de un cliente: saldo adeudado, cupo disponible y porcentaje de uso del cupo
// conecta con: CreditAccountDetail (la muestra), wallet.helpers (getUsagePercentage y getUsageLevel) y wallet.account.types (props)
import React from 'react'
import { formatCOP } from '@/global/helpers/format'
import { getUsagePercentage, getUsageLevel } from '../../helpers/wallet.helpers'
import type { CreditAccountMetricsProps } from '../../types/wallet.account.types'
import './CreditAccountMetrics.css'

export const CreditAccountMetrics: React.FC<CreditAccountMetricsProps> = ({
  usedCredit,
  availableCredit,
  creditLimit,
}) => {
  const percentage = getUsagePercentage(usedCredit, creditLimit)
  const usageLevel = getUsageLevel(percentage)

  return (
    /* Banner de Saldo, Cupo y Uso */
    <div className="credit-drawer-metrics-card">
      <div className="credit-drawer-metrics-grid">
        <div className="credit-drawer-metric-col">
          <span className="credit-drawer-metric-label">Saldo Adeudado</span>
          <span className="credit-drawer-metric-value-debt credit-drawer-text-rose">
            {formatCOP(usedCredit)}
          </span>
        </div>
        <div className="credit-drawer-metric-col">
          <span className="credit-drawer-metric-label">Cupo Disponible</span>
          <span className="credit-drawer-metric-value-avail credit-drawer-text-emerald">
            {formatCOP(availableCredit)}
          </span>
        </div>
      </div>

      {/* Uso de Cupo integrado con animación de carga */}
      <div className="credit-drawer-usage-section">
        <div className="credit-drawer-usage-header">
          <span className="credit-drawer-usage-label">Uso de Cupo</span>
          <span className="credit-drawer-usage-percentage">{percentage}%</span>
        </div>
        <div className="credit-drawer-progress-bar">
          <div
            className={`credit-drawer-progress-fill credit-drawer-progress-${usageLevel} credit-table-progress-${usageLevel}`}
            style={{ '--target-pct': `${percentage}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}

export default CreditAccountMetrics
