// VerifyInvoiceGoodsModal · cotejo físico de mercancía: valida que los ítems que salen de bodega coincidan con la factura emitida
// conecta con: CashOrdersPanel (lo abre), useSaleLines (renglones del pedido) y VerifyLinesTable (tabla con casillas)
// ojo: solo se autoriza la salida cuando todos los renglones están marcados; el marcado es local al modal
import React, { useState } from 'react'
import { formatCurrency } from '@/global/helpers/format'
import { notify } from '@/global/helpers/toast'
import { useSaleLines } from '../hooks/useSaleLines'
import { VerifyLinesTable } from './VerifyLinesTable'
import './VerifyInvoiceGoodsModal.css'

interface Props {
  orderId: number
  serial: string
  customerName: string
  total: number
  isImmediate?: boolean
  onClose: () => void
  onVerified: () => void
}

export const VerifyInvoiceGoodsModal: React.FC<Props> = ({ orderId, serial, customerName, total, isImmediate, onClose, onVerified }) => {
  const { lines, loading } = useSaleLines(orderId)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const toggle = (lineId: number) => setChecked((prev) => ({ ...prev, [lineId]: !prev[lineId] }))
  const allChecked = lines.length > 0 && lines.every((line) => checked[line.id])

  const confirm = () => {
    if (!allChecked) return notify.error('Debes marcar y verificar todos los productos de la factura antes de dar salida.')
    notify.success(`¡Mercancía de la orden ${serial} verificada al 100% contra factura! Salida autorizada.`)
    onVerified()
    onClose()
  }

  return (
    <div className="vig-modal-overlay" role="dialog" aria-modal="true">
      <div className="vig-modal-content">
        <header className="vig-modal-header">
          <div>
            <div className="vig-badge-row">
              <span className="vig-badge-tag">Auditoría de Mostrador y Caja</span>
              {isImmediate && <span className="vig-badge-immediate">⚡ Picking Inmediato</span>}
            </div>
            <h3 className="vig-modal-title">Verificación de Factura vs Salida Física</h3>
            <p className="vig-modal-subtitle">Orden: <strong>{serial}</strong> · Cliente: <strong>{customerName}</strong></p>
          </div>
          <button type="button" className="vig-modal-close" onClick={onClose}>✕</button>
        </header>

        <div className="vig-modal-body">
          <div className="vig-instruction-card">
            <span className="vig-instruction-icon">🔍</span>
            <p>Revisa físicamente cada repuesto entregado por el bodeguero antes de que el cliente salga del establecimiento. Marca cada casilla para confirmar coincidencia de SKU y cantidades.</p>
          </div>
          <VerifyLinesTable lines={lines} loading={loading} checked={checked} onToggle={toggle} />
          <div className="vig-summary-bar">
            <span>Total Facturado: <strong>{formatCurrency(total)}</strong></span>
            <span>Verificados: <strong>{Object.values(checked).filter(Boolean).length} / {lines.length}</strong></span>
          </div>
        </div>

        <footer className="vig-modal-footer">
          <button type="button" className="vig-btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="vig-btn-confirm" disabled={!allChecked} onClick={confirm}>
            {allChecked ? '✓ Autorizar Salida de Mercancía' : 'Pendiente Cotejo Completo'}
          </button>
        </footer>
      </div>
    </div>
  )
}
