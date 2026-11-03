// ReturnsKpis · las cuatro tarjetas de arriba de devoluciones (casos, cambios, saldos a favor y pendientes)
// conecta con: ReturnsScreen; recibe los conteos de returns.selectors
import React from 'react'
import type { ReturnsCounts } from '../helpers/returns.helpers'

export const ReturnsKpis: React.FC<{ counts: ReturnsCounts }> = ({ counts }) => (
  <div className="returns-kpi-grid">
    <div className="returns-kpi-card">
      <span className="returns-kpi-label">Total Casos Registrados</span>
      <strong className="returns-kpi-value">{counts.total}</strong>
    </div>
    <div className="returns-kpi-card">
      <span className="returns-kpi-label">Productos a Cambio (Garantía)</span>
      <strong className="returns-kpi-value is-exchange">{counts.exchange}</strong>
    </div>
    <div className="returns-kpi-card">
      <span className="returns-kpi-label">Saldos a Favor Generados</span>
      <strong className="returns-kpi-value is-credit">{counts.creditBalance}</strong>
    </div>
    <div className="returns-kpi-card">
      <span className="returns-kpi-label">Pendientes por Revisar</span>
      <strong className="returns-kpi-value is-pending">{counts.pending}</strong>
    </div>
  </div>
)
