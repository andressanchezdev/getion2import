// AbonoDetailPanel · detalle de un abono o recaudo en el panel derecho: recibo, cliente, bodega, venta, método, quién lo registró y verificó, y el comprobante
// conecta con: AbonosTable (lo abre con «abonoDetail»), formRegistry y global format; solo muestra, no cambia nada
// ojo: la bodega ya no es columna de la tabla: se ve aquí; el estado «En revisión» es el pago que aún no se verifica (las transferencias esperan la conciliación con el banco)
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './AbonoDetailPanel.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import type { AbonoRecord } from '../../types/wallet.types'

const STATUS: Record<AbonoRecord['status'], { label: string; tone: PillTone }> = {
  verified: { label: 'Verificado', tone: 'green' },
  pending: { label: 'En revisión', tone: 'amber' },
  void: { label: 'Anulado', tone: 'gray' },
}

export const AbonoDetailPanel: React.FC<{ abono: AbonoRecord }> = ({ abono }) => {
  const dispatch = useAppDispatch()
  const status = STATUS[abono.status]
  const warehouse = [abono.warehouseCode, abono.warehouseName].filter(Boolean).join(' · ')
  const rows: Array<[string, React.ReactNode]> = [
    ['Recibo', abono.serialCode],
    ['Fecha', abono.date || '—'],
    ['Cliente', abono.customerName],
    ['Identificación', abono.customerDoc],
    ['Bodega', warehouse || 'Sin bodega'],
    ['Venta o documento', abono.saleSerial || '—'],
    ['Método', abono.method === 'cash' ? 'Efectivo' : 'Transferencia'],
    ['Referencia', abono.reference || '—'],
    ['Monto', <strong key="amount">{formatCOP(abono.amount)}</strong>],
    ['Estado', <Pill key="status" tone={status.tone}>{status.label}</Pill>],
    ['Registrado por', abono.employeeName || '—'],
    ['Verificado por', abono.verifiedByName || (abono.status === 'pending' ? 'Aún sin verificar' : '—')],
  ]

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <dl className="abono-detail">
          {rows.map(([label, value]) => (
            <div key={label} className="abono-detail-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {abono.note && <div className="drawer-form-note">{abono.note}</div>}
        {abono.proofUrl && (
          <div className="drawer-form-field">
            <span className="drawer-form-label">Comprobante</span>
            <img className="abono-detail-proof" src={abono.proofUrl} alt={`Comprobante del recibo ${abono.serialCode}`} />
          </div>
        )}
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
      </div>
    </div>
  )
}

export default AbonoDetailPanel
