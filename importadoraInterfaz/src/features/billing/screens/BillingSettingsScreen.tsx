// BillingSettingsScreen · Configuración > Facturación: los datos fiscales de la bodega activa (con lo que queda del rango autorizado) y la tabla de series de consecutivos
// conecta con: useBillingSettings (datos y paneles), billing.rules (próximo número y rango restante), billing.constants (nombres), RowActions y Pill; la monta MainContent (screenRegistry)
// ojo: sin datos fiscales no se puede facturar: se avisa y se ofrece configurarlos; editar una serie abre su panel lateral
import React from 'react'
import './BillingSettingsScreen.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import editIcon from '@/assets/icons/edit.svg?raw'
import { DOC_SERIES_LABELS } from '../constants/billing.constants'
import { nextNumberLabel, rangeRemaining } from '../helpers/billing.rules'
import { useBillingSettings } from '../hooks/useBillingSettings'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

export const BillingSettingsScreen: React.FC = () => {
  const billing = useBillingSettings()
  const { config } = billing
  const invoiceSeries = billing.series.find((series) => series.docType === 'invoice')
  const remaining = config && invoiceSeries ? rangeRemaining(config, invoiceSeries.nextNumber) : null
  const date = new Date()
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const resolutionWarnings = config
    ? [
        !config.resolutionNumber.trim() ? 'No hay una resolución DIAN configurada; la facturación permanece habilitada.' : '',
        config.rangeFrom === null || config.rangeTo === null ? 'No hay un rango de numeración completo; la facturación permanece habilitada.' : '',
        config.resolutionValidUntil && config.resolutionValidUntil < today ? 'La resolución DIAN está vencida; la facturación permanece habilitada.' : '',
        remaining === 0 ? 'El rango autorizado está agotado; la facturación permanece habilitada.' : '',
        config.rangeFrom !== null && invoiceSeries && invoiceSeries.nextNumber < config.rangeFrom ? 'El próximo consecutivo está por debajo del rango autorizado.' : '',
      ].filter(Boolean)
    : []

  const message = billing.warehouseId <= 0 ? 'Elige una bodega para ver su facturación.' : billing.failed ? billing.error : billing.loading ? 'Cargando facturación…' : null

  return (
    <div className="billing-screen">
      <div className="billing-card">
        <div className="billing-card-head">
          <div>
            <h3 className="billing-card-title">Datos fiscales · {billing.warehouseName || 'sin bodega'}</h3>
            <span className="billing-muted">Con estos datos se emiten las facturas de la bodega.</span>
          </div>
          <button type="button" className="btn-primary" disabled={billing.warehouseId <= 0 || billing.loading} onClick={billing.editConfig}>
            {config ? 'Editar datos fiscales' : 'Configurar datos fiscales'}
          </button>
        </div>
        {message ? (
          <p className="billing-message">{message}</p>
        ) : !config ? (
          <p className="billing-message">Esta bodega todavía no tiene datos fiscales: sin ellos no se pueden emitir facturas.</p>
        ) : (
          <dl className="billing-facts">
            <div><dt>Razón social</dt><dd>{config.legalName}</dd></div>
            <div><dt>{config.documentType}</dt><dd>{config.nit}</dd></div>
            <div><dt>Resolución</dt><dd>{config.resolutionNumber || '—'}{config.resolutionDate ? ` · ${config.resolutionDate}` : ''}{config.resolutionValidUntil ? ` · Vigente hasta ${config.resolutionValidUntil}` : ''}</dd></div>
            <div><dt>Prefijo y rango</dt><dd>{config.invoicePrefix || '—'} · {config.rangeFrom ?? '—'} a {config.rangeTo ?? '—'}</dd></div>
            <div>
              <dt>Números por usar</dt>
              <dd>{remaining === null ? '—' : <Pill tone={remaining < 100 ? 'amber' : 'green'}>{remaining}</Pill>}</dd>
            </div>
            <div><dt>Estado</dt><dd><Pill tone={config.isActive ? 'green' : 'gray'}>{config.isActive ? 'Activa' : 'Inactiva'}</Pill></dd></div>
          </dl>
        )}
        {resolutionWarnings.map((warning) => <p className="billing-resolution-warning" role="alert" key={warning}>{warning}</p>)}
      </div>

      <div className="billing-card">
        <div className="billing-card-head">
          <div>
            <h3 className="billing-card-title">Series de consecutivos</h3>
            <span className="billing-muted">El número que llevará el próximo documento de cada tipo.</span>
          </div>
        </div>
        <DataTable tableId="billing-billing-settings">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Prefijo</th>
                <th className="billing-num">Próximo número</th>
                <th>Saldrá como</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {billing.series.length === 0 ? (
                <tr>
                  <td colSpan={5} className="billing-message">{billing.loading ? 'Cargando series…' : 'Esta bodega todavía no tiene series: se crean solas al emitir el primer documento.'}</td>
                </tr>
              ) : (
                billing.series.map((series) => (
                  <tr key={series.id}>
                    <td><strong>{DOC_SERIES_LABELS[series.docType] ?? series.docType}</strong></td>
                    <td>{series.prefix}</td>
                    <td className="billing-num table-amount">{series.nextNumber}</td>
                    <td>{nextNumberLabel(series.prefix, series.nextNumber)}</td>
                    <td>
                      <RowActions actions={[{ key: 'edit', label: `Editar la serie de ${DOC_SERIES_LABELS[series.docType] ?? series.docType}`, icon: editIcon, onClick: () => billing.editSeries(series) }]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
      </div>
    </div>
  )
}

export default BillingSettingsScreen
