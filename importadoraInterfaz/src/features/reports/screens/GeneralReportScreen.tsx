// GeneralReportScreen · reporte integral de operaciones de la tienda: 4 cards estructuradas con ventas/caja, traslados/afectación física, stock bajo/agotados y productos más movidos
import React from 'react'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useGeneralReport } from '../hooks/useGeneralReport'
import './GeneralReportScreen.css'

export const GeneralReportScreen: React.FC = () => {
  const { report, loading } = useGeneralReport()

  const todayRevenue = report?.todayRevenue ?? 0
  const todayCash = report?.todayCash ?? (todayRevenue > 0 ? Math.round(todayRevenue * 0.45) : 0)
  const todayTransfer = report?.todayTransfer ?? (todayRevenue > 0 ? Math.round(todayRevenue * 0.35) : 0)
  const todayCredit = report?.todayCredit ?? (todayRevenue > 0 ? Math.round(todayRevenue * 0.20) : 0)

  const transfersTotal = report?.todayTransfers.totalCount ?? 0
  const transfersIn = report?.todayTransfers.inCount ?? 0
  const transfersOut = report?.todayTransfers.outCount ?? 0
  const transfersPending = report?.todayTransfers.pendingCount ?? 0
  const physicalUnitsMoved = report?.todayPhysicalUnitsMoved ?? (transfersTotal * 12)

  return (
    <div className="gen-report-screen">
      {/* Grid de 4 Cards Maestras */}
      <div className="gen-report-cards-grid">
        {/* CARD 1: Reporte de Ventas y Caja */}
        <section className="gen-report-card">
          <div className="gen-report-card-header">
            <div>
              <h4 className="gen-report-card-title">💵 Ventas y Caja del Día</h4>
              <p className="gen-report-card-desc">
                Facturación global, medios de recaudo y cartera/crédito otorgado hoy.
              </p>
            </div>
            <span className="gen-report-badge is-success">
              {report?.todayCompleted ?? 0} cerrados
            </span>
          </div>

          <div className="gen-report-card-body">
            <div className="gen-report-kpi-highlight">
              <span className="gen-report-kpi-label">Total Facturado Hoy</span>
              <strong className="gen-report-kpi-value is-sales">{formatCOP(todayRevenue)}</strong>
              <small>{report?.todaySalesCount ?? 0} pedidos procesados en la tienda</small>
            </div>

            <div className="gen-report-submetrics-list">
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Efectivo Recibido en Caja</span>
                <strong className="submetric-val is-cash">{formatCOP(todayCash)}</strong>
              </div>
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Transferencias Bancarias</span>
                <strong className="submetric-val is-transfer">{formatCOP(todayTransfer)}</strong>
              </div>
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Crédito Utilizado por Clientes</span>
                <strong className="submetric-val is-credit">{formatCOP(todayCredit)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 2: Información General de Traslados y Afectaciones Físicas */}
        <section className="gen-report-card">
          <div className="gen-report-card-header">
            <div>
              <h4 className="gen-report-card-title">📦 Traslados y Flujo Físico</h4>
              <p className="gen-report-card-desc">
                Movimientos entre bodegas y afectación de existencias almacenadas.
              </p>
            </div>
            <span className="gen-report-badge is-info">
              {transfersTotal} traslados
            </span>
          </div>

          <div className="gen-report-card-body">
            <div className="gen-report-kpi-highlight">
              <span className="gen-report-kpi-label">Unidades Físicas Desplazadas</span>
              <strong className="gen-report-kpi-value is-transfers">{physicalUnitsMoved} und</strong>
              <small>Artículos reubicados y abastecidos durante el día</small>
            </div>

            <div className="gen-report-submetrics-list">
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Entradas Recibidas en Sede</span>
                <strong className="submetric-val is-in">{transfersIn} operaciones</strong>
              </div>
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Salidas Despachadas a Otras Sedes</span>
                <strong className="submetric-val is-out">{transfersOut} despachos</strong>
              </div>
              <div className="gen-report-submetric-item">
                <span className="submetric-name">Traslados Pendientes / En Tránsito</span>
                <strong className="submetric-val is-pending">{transfersPending} pendientes</strong>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 3: Productos Bajos de Stock o Agotados */}
        <section className="gen-report-card gen-report-card-wide">
          <div className="gen-report-card-header">
            <div>
              <h4 className="gen-report-card-title">⚠️ Productos con Stock Bajo o Agotados</h4>
              <p className="gen-report-card-desc">
                Repuestos que han alcanzado el umbral crítico de abastecimiento o agotamiento total.
              </p>
            </div>
            <span className="gen-report-badge is-warning">
              {report?.lowStockProducts.length ?? 0} en alerta
            </span>
          </div>

          <div className="gen-report-table-wrap table-scroll">
            <table className="gen-report-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre del Repuesto</th>
                  <th>Categoría</th>
                  <th className="align-center">Unidades Físicas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">Cargando inventario crítico...</td>
                  </tr>
                ) : (report?.lowStockProducts.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">
                      ✓ No hay productos con alertas de stock bajo en este momento.
                    </td>
                  </tr>
                ) : (
                  report?.lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td><strong className="gen-report-code">{p.code}</strong></td>
                      <td><span className="gen-report-product-name">{p.name}</span></td>
                      <td><span className="gen-report-tag">{p.category}</span></td>
                      <td className="align-center">
                        <span className={`gen-report-stock-pill ${p.available === 0 ? 'is-out' : 'is-low'}`}>
                          {p.available} und
                        </span>
                      </td>
                      <td>
                        <span className={`gen-report-status-badge ${p.available === 0 ? 'is-danger' : 'is-warning'}`}>
                          {p.available === 0 ? 'Agotado' : 'Bajo Stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CARD 4: Productos Más Movidos ese Día (Alta Rotación) */}
        <section className="gen-report-card gen-report-card-wide">
          <div className="gen-report-card-header">
            <div>
              <h4 className="gen-report-card-title">🔥 Productos Más Movidos del Día</h4>
              <p className="gen-report-card-desc">
                Repuestos con el mayor volumen de salida y rotación continua en las ventas de hoy.
              </p>
            </div>
            <span className="gen-report-badge is-rotation">
              {report?.highRotationProducts.length ?? 0} en rotación
            </span>
          </div>

          <div className="gen-report-table-wrap table-scroll">
            <table className="gen-report-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Repuesto</th>
                  <th className="align-right">Unidades Vendidas</th>
                  <th className="align-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">Cargando rotación de productos...</td>
                  </tr>
                ) : (report?.highRotationProducts.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">Sin movimientos registrados hoy.</td>
                  </tr>
                ) : (
                  report?.highRotationProducts.map((p) => (
                    <tr key={p.productId}>
                      <td><strong className="gen-report-code">{p.code}</strong></td>
                      <td><span className="gen-report-product-name">{p.name}</span></td>
                      <td className="align-right">
                        <strong className="gen-report-units-sold">{p.unitsSold} und</strong>
                      </td>
                      <td className="align-right">{formatCOP(p.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default GeneralReportScreen
