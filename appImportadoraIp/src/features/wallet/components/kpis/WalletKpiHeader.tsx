// WalletKpiHeader · tarjetas de totales de cartera (por cobrar, clientes en mora, cupo y clientes con crédito)
// conecta con: wallet.selectors (selectWalletKpis, que sale de POST /wallet/summary), global StatCard
// src/features/wallet/components/kpis/WalletKpiHeader.tsx
import React from 'react'
import './WalletKpiHeader.css'
// ojo: formatCOP ahora salen de global/helpers/format (antes estaban repetidas en cada componente)
import { formatCOP } from '@/global/helpers/format'
import { StatCard } from '@/global/components/UI/molecules/StatCard'
import { useAppSelector } from '@/global/hooks/useRedux'
// ojo: los totales ahora salen de wallet.selectors (antes se calculaban aquí con useMemo)
import { selectWalletKpis, selectWalletSummaryFailed } from '../../selectors/wallet.selectors'

export const WalletKpiHeader: React.FC = () => {
  const kpis = useAppSelector(selectWalletKpis)
  const failed = useAppSelector(selectWalletSummaryFailed)
  const unavailable = 'No disponible'

  return (
    <div className="wallet-kpi-grid">
      <StatCard
        title="Total Cartera por Cobrar"
        value={failed ? unavailable : formatCOP(kpis.totalReceivable)}
        subtitle="Saldo adeudado por los clientes"
        badge={{ text: 'Activo', variant: 'indigo' }}
      />
      <StatCard
        title="Clientes en Mora"
        value={failed ? unavailable : String(kpis.customersOverdue)}
        subtitle="Con facturas vencidas"
        badge={{ text: 'Alerta', variant: 'rose' }}
        trend={kpis.customersOverdue > 0 ? { value: 'Requieren gestión', positive: false } : undefined}
      />
      <StatCard
        title="Cupo Total Aprobado"
        value={failed ? unavailable : formatCOP(kpis.totalLimit)}
        subtitle="Límite financiero global"
        badge={{ text: 'Cupos', variant: 'emerald' }}
      />
      <StatCard
        title="Clientes con Crédito"
        value={failed ? unavailable : String(kpis.customersWithCredit)}
        subtitle={`Plazo promedio: ${Math.round(kpis.averageCreditDays)} días`}
        badge={{ text: 'Clientes', variant: 'slate' }}
      />
    </div>
  )
}

export default WalletKpiHeader
