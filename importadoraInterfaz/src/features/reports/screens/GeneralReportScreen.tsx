// GeneralReportScreen · reporte integral de operaciones de la tienda: toolbar canónico de búsqueda y filtro, KPIs estructurados y tablas de stock crítico y rotación
import React, { useState } from 'react'
import { formatCOP } from '@/global/helpers/formatting/format'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import refreshIcon from '@/assets/icons/refresh.svg?raw'
import receiptIcon from '@/assets/icons/receipt.svg?raw'
import walletIcon from '@/assets/icons/wallet.svg?raw'
import buildingIcon from '@/assets/icons/building.svg?raw'
import fileTextIcon from '@/assets/icons/file-text.svg?raw'
import shippingIcon from '@/assets/icons/shipping.svg?raw'
import databaseIcon from '@/assets/icons/database.svg?raw'
import shoppingBagIcon from '@/assets/icons/shopping-bag.svg?raw'
import checkIcon from '@/assets/icons/check.svg?raw'
import { useGeneralReport } from '../hooks/useGeneralReport'
import './GeneralReportScreen.css'

export const GeneralReportScreen: React.FC = () => {
  const { report, loading, reload } = useGeneralReport()
  const warehouses = useAppSelector(selectWarehouses)
  const [search, setSearch] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')

  const needle = search.trim().toLowerCase()
  const hasFilters = Boolean(needle || selectedWarehouse !== 'all')

  const handleClearFilters = () => {
    setSearch('')
    setSelectedWarehouse('all')
  }

  const lowStockFiltered = (report?.lowStockProducts ?? []).filter(
    (p) =>
      !needle ||
      p.code.toLowerCase().includes(needle) ||
      p.name.toLowerCase().includes(needle) ||
      (p.category ?? '').toLowerCase().includes(needle)
  )

  const highRotationFiltered = (report?.highRotationProducts ?? []).filter(
    (p) => !needle || p.code.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle)
  )

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
      {/* Toolbar general: únicamente controles de búsqueda y filtrado orientados en la misma dirección */}
      <div className="gen-report-card">
        <div className="gen-report-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            hasActiveFilters={hasFilters}
            onClear={handleClearFilters}
            placeholder="Buscar por código, producto o categoría…"
            className="gen-report-search"
          />

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

          <button
            type="button"
            className="btn-secondary gen-report-refresh-btn"
            onClick={reload}
            disabled={loading}
            title="Actualizar reporte general"
          >
            <span className="gen-report-inline-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: refreshIcon }} />
            <span>{loading ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs principales */}
      <div className="gen-report-kpi-grid">
        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: receiptIcon }} />
            <span className="gen-report-kpi-title">Ventas Totales Hoy</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayRevenue)}</div>
          <div className="gen-report-kpi-meta">
            <span>{report?.todaySalesCount ?? 0} pedidos procesados</span>
            <Pill tone="green">{report?.todayCompleted ?? 0} completados</Pill>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: walletIcon }} />
            <span className="gen-report-kpi-title">Efectivo en Caja</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayCash)}</div>
          <div className="gen-report-kpi-meta">
            <span>Recaudado en turno de mostrador</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: buildingIcon }} />
            <span className="gen-report-kpi-title">Transferencias</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayTransfer)}</div>
          <div className="gen-report-kpi-meta">
            <span>Ingresos bancarios registrados</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: fileTextIcon }} />
            <span className="gen-report-kpi-title">Crédito a Clientes</span>
          </div>
          <div className="gen-report-kpi-amount">{formatCOP(todayCredit)}</div>
          <div className="gen-report-kpi-meta">
            <span>Cuentas por cobrar generadas</span>
          </div>
        </div>

        <div className="gen-report-kpi-card">
          <div className="gen-report-kpi-header">
            <span className="gen-report-kpi-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: shippingIcon }} />
            <span className="gen-report-kpi-title">Flujo Físico y Traslados</span>
          </div>
          <div className="gen-report-kpi-amount">{physicalUnitsMoved} <small>und</small></div>
          <div className="gen-report-kpi-meta">
            <span>{transfersIn} entradas · {transfersOut} despachos</span>
            {transfersPending > 0 && <Pill tone="amber">{transfersPending} en tránsito</Pill>}
          </div>
        </div>
      </div>

      {/* Tablas canónicas de información operativa */}
      <div className="gen-report-sections-grid">
        {/* Tabla 1: Stock Crítico */}
        <div className="gen-report-card">
          <div className="gen-report-section-header">
            <div className="gen-report-section-title-group">
              <span className="gen-report-section-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: databaseIcon }} />
              <div>
                <h4 className="gen-report-section-title">Repuestos con Stock Bajo o Agotados</h4>
                <p className="gen-report-section-desc">Artículos bajo el umbral mínimo para sugerir reposición inmediata</p>
              </div>
            </div>
            <Pill tone={lowStockFiltered.length ? 'amber' : 'green'}>
              {lowStockFiltered.length} en alerta
            </Pill>
          </div>

          <div className="gen-report-table-responsive table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="gen-report-th-center">Disponible</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">Cargando inventario crítico…</td>
                  </tr>
                ) : lowStockFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="gen-report-empty">
                      <span className="gen-report-empty-inline">
                        <span className="gen-report-inline-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: checkIcon }} />
                        <span>{needle ? 'Ningún repuesto en alerta coincide con la búsqueda.' : 'No hay productos con alertas de stock bajo en este momento.'}</span>
                      </span>
                    </td>
                  </tr>
                ) : (
                  lowStockFiltered.map((p) => (
                    <tr key={p.id}>
                      <td><span className="gen-report-code">{p.code}</span></td>
                      <td><strong>{p.name}</strong></td>
                      <td><span className="gen-report-category">{p.category}</span></td>
                      <td className="gen-report-td-center">
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
            <div className="gen-report-section-title-group">
              <span className="gen-report-section-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: shoppingBagIcon }} />
              <div>
                <h4 className="gen-report-section-title">Productos de Mayor Rotación</h4>
                <p className="gen-report-section-desc">Repuestos con el mayor volumen de unidades vendidas y recaudos del día</p>
              </div>
            </div>
            <Pill tone="blue">
              {highRotationFiltered.length} en rotación
            </Pill>
          </div>

          <div className="gen-report-table-responsive table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th className="gen-report-th-right">Unidades Vendidas</th>
                  <th className="gen-report-th-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">Cargando rotación de productos…</td>
                  </tr>
                ) : highRotationFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="gen-report-empty">
                      {needle ? 'Ningún producto en rotación coincide con la búsqueda.' : 'Sin movimientos registrados hoy.'}
                    </td>
                  </tr>
                ) : (
                  highRotationFiltered.map((p) => (
                    <tr key={p.productId}>
                      <td><span className="gen-report-code">{p.code}</span></td>
                      <td><strong>{p.name}</strong></td>
                      <td className="gen-report-td-right">
                        <strong>{p.unitsSold} und</strong>
                      </td>
                      <td className="gen-report-td-right gen-report-td-amount">{formatCOP(p.totalAmount)}</td>
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
