// BankKpis · resumen de las entradas de la página cargada: cuántas, cuánto falta por confirmar y cuánto ya está confirmado
// conecta con: BankReconciliationScreen (lo pinta), bank.selectors (selectBankSummary) y global format (pesos)
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectBankSummary } from '../../selectors/bank.selectors'

export const BankKpis: React.FC = () => {
  const summary = useAppSelector(selectBankSummary)
  return (
    <div className="bank-kpis">
      <div className="bank-kpi">
        <span className="bank-kpi-label">Entradas en esta página</span>
        <strong className="bank-kpi-value table-amount">{formatPesos(summary.incomeTotal)}</strong>
        <small>{summary.incomeCount} movimientos</small>
      </div>
      <div className="bank-kpi">
        <span className="bank-kpi-label">Por confirmar</span>
        <strong className="bank-kpi-value table-amount">{formatPesos(summary.pendingTotal)}</strong>
        <small>{summary.pendingCount} movimientos</small>
      </div>
      <div className="bank-kpi">
        <span className="bank-kpi-label">Confirmado</span>
        <strong className="bank-kpi-value table-amount">{formatPesos(summary.confirmedTotal)}</strong>
        <small>ya entró al banco</small>
      </div>
    </div>
  )
}

export default BankKpis
