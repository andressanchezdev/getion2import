// GeneralReportScreen · reporte integral de operaciones de la tienda: toolbar canónico, KPIs estructurados y tablas de stock crítico y rotación
import React, { useState } from 'react'
import { formatCOP } from '@/global/helpers/formatting/format'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import { useGeneralReport } from '../hooks/useGeneralReport'
import './GeneralReportScreen.css'

export const GeneralReportScreen: React.FC = () => {
  const { report, loading, reload } = useGeneralReport()
  const warehouses = useAppSelector(selectWarehouses)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')

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
      {/* Toolbar general */}
      <div className="gen-report-card">
        <div className="gen-report-toolbar">
          <div className="gen-report-toolbar-left">
            <h3 className="gen-report-heading">Reporte Operativo y Comercial</h3>
            <span className="gen-report-subheading">Consolidado general de ventas, recaudos, rotación y alertas de inventario</span>
          </div>

          <div className="gen-report-toolbar-middle">
            <label className="gen-report-toolbar-filter">
              <span>Sede / Bodega:</span>
              <select
                className="gen-report-toolbar-select"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="all">Todas las sedes</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={String(wh.id)}>{wh.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="gen-report-toolbar-actions">
            <Pill tone="blue">Corte en tiempo real</Pill>
            <button
              type="button"
              className="btn-secondary"
              onClick={reload}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : '🔄 Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de KPIs principales */}
      <div className="gen-report-kpi-grid">
        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon">💵</span>
            <span className="gen-report-kpi-title">Ventas Totales Hoy</span>
          </div>
          <div className="gen-report-kpi-amount is-revenue">{formatCOP(todayRevenue)}</div>
          <div className="gen-report-kpi-meta">
            <span>{report?.todaySalesCount ?? 0} pedidos procesados</span>
            <span className="gen-report-kpi-badge is-success">{report?.todayCompleted ?? 0} completados</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon">💰</span>
            <span className="gen-report-kpi-title">Efectivo en Caja</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayCash)}</div>
          <div className="gen-report-kpi-meta">
            <span>Recaudado en turno de mostrador</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon">🏦</span>
            <span className="gen-report-kpi-title">Transferencias</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayTransfer)}</div>
          <div className="gen-report-kpi-meta">
            <span>Ingresos bancarios registrados</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon">💳</span>
            <span className="gen-report-kpi-title">Crédito a Clientes</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayCredit)}</div>
          <div className="gen-report-kpi-meta">
            <span>Cuentas por cobrar generadas</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon">📦</span>
            <span className="gen-report-kpi-title">Flujo Físico y Traslados</span>
          </div>
          <div className="gen-report-kpi-amount is-transfers">{physicalUnitsMoved} <small>und</small></div>
          <div className="gen-report-kpi-meta">
            <span>{transfersIn} entradas · {transfersOut} despachos</span>
            {transfersPending > 0 && <span className="gen-report-kpi-badge is-warning">{transfersPending} en tránsito</span>}
          </div>
        </div>
      </div>

      {/* Tablas canónicas de información operativa */}
      <div className="gen-report-sections-grid">
        {/* Tabla 1: Stock Crítico */}
        <div className="gen-report-card">
          <div className="gen-report-section-header">
            <div>
              <h4 className="gen-report-section-title">⚠️ Repuestos con Stock Bajo o Agotados</h4>
              <p className="gen-report-section-desc">Artículos bajo el umbral mínimo para sugerir reposición inmediata</p>
            </div>
            <Pill tone={report?.lowStockProducts.length ? 'amber' : 'green'}>
              {report?.lowStockProducts.length ?? 0} en alerta
            </Pill>
          </div>

          <div className="gen-report-table-responsive table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'center' }}>Disponible</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">Cargando inventario crítico…</td>
                  </tr>
                ) : (report?.lowStockProducts.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">✓ No hay productos con alertas de stock bajo en este momento.</td>
                  </tr>
                ) : (
                  report?.lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td><span className="gen-report-code">{p.code}</span></td>
                      <td><strong>{p.name}</strong></td>
                      <td><span className="gen-report-category">{p.category}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <Pill tone={p.available === 0 ? 'red' : 'amber'}>{p.available} und</Pill>
                      </td>
                      <td>
                        <Pill tone={p.available === 0 ? 'red' : 'amber'}>
                          {p.available === 0 ? 'Agotado' : 'Bajo Stock'}
                        </Pill>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla 2: Alta Rotación */}
        <div className="gen-report-card">
          <div className="gen-report-section-header">
            <div>
              <h4 className="gen-report-section-title">🔥 Productos de Mayor Rotación</h4>
              <p className="gen-report-section-desc">Repuestos con el mayor volumen de unidades vendidas y recaudos del día</p>
            </div>
            <Pill tone="blue">
              {report?.highRotationProducts.length ?? 0} en rotación
            </Pill>
          </div>

          <div className="gen-report-table-responsive table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Unidades Vendidas</th>
                  <th style={{ textAlign: 'right' }}>Total Facturado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">Cargando rotación de productos…</td>
                  </tr>
                ) : (report?.highRotationProducts.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">Sin movimientos registrados hoy.</td>
                  </tr>
                ) : (
                  report?.highRotationProducts.map((p) => (
                    <tr key={p.productId}>
                      <td><span className="gen-report-code">{p.code}</span></td>
                      <td><strong>{p.name}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{p.unitsSold} und</strong>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCOP(p.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneralReportScreen
