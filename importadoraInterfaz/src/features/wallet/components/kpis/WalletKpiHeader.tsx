// WalletKpiHeader · tarjetas de totales de cartera (por cobrar, clientes en mora, cupo y clientes con crédito)
// conecta con: wallet.selectors (selectWalletKpis, que sale de POST /wallet/summary)
import React from 'react'
import './WalletKpiHeader.css'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWalletKpis } from '../../selectors/wallet.selectors'

export const WalletKpiHeader: React.FC = () => {
  const kpis = useAppSelector(selectWalletKpis)

  return (
    <div className="wallet-kpis">
      <div className="wallet-kpi">
        <span className="wallet-kpi-label">Total Cartera por Cobrar</span>
        <strong className="wallet-kpi-value">{formatCOP(kpis.totalReceivable)}</strong>
        <small>Saldo adeudado por los clientes</small>
      </div>
      <div className="wallet-kpi">
        <span className="wallet-kpi-label">Clientes en Mora</span>
        <strong className="wallet-kpi-value">{kpis.customersOverdue}</strong>
        <small>{kpis.customersOverdue > 0 ? 'Requieren gestión' : 'Al día'}</small>
      </div>
      <div className="wallet-kpi">
        <span className="wallet-kpi-label">Cupo Total Aprobado</span>
        <strong className="wallet-kpi-value">{formatCOP(kpis.totalLimit)}</strong>
        <small>Límite financiero global</small>
      </div>
      <div className="wallet-kpi">
        <span className="wallet-kpi-label">Clientes con Crédito</span>
        <strong className="wallet-kpi-value">{kpis.customersWithCredit}</strong>
        <small>Plazo promedio: {Math.round(kpis.averageCreditDays)} días</small>
      </div>
    </div>
  )
}

export default WalletKpiHeader
