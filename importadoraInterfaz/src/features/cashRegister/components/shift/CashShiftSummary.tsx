// CashShiftSummary · resumen persistente del turno: estado, bodega, quién lo abrió, desde cuándo, fondo inicial y lo recaudado hasta ahora
// conecta con: CashRegisterScreen (lo pinta) y global format; recibe el turno ya cargado por useCashSession
// ojo: los totales del turno abierto son en vivo (los entrega el backend); sin turno abierto solo dice que está cerrado
import React from 'react'
import './CashShiftSummary.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { formatCOP, formatDateTime } from '@/global/helpers/formatting/format'
import type { CashSession } from '../../types/cash.types'

interface Props {
  session: CashSession | null
  warehouseName: string
}

export const CashShiftSummary: React.FC<Props> = ({ session, warehouseName }) => (
  <div className="cash-summary" aria-live="polite">
    <Pill tone={session ? 'green' : 'amber'}>{session ? 'Turno abierto' : 'Turno cerrado'}</Pill>
    <span className="cash-summary-item">
      Bodega <strong>{session?.warehouseName || warehouseName || 'sin elegir'}</strong>
    </span>
    {session && (
      <>
        <span className="cash-summary-item">
          Responsable <strong>{session.openedByName}</strong>
        </span>
        <span className="cash-summary-item">
          Desde <strong>{formatDateTime(session.openedAt)}</strong>
        </span>
        <span className="cash-summary-item">
          Fondo inicial <strong>{formatCOP(session.openingAmount)}</strong>
        </span>
        <span className="cash-summary-item">
          Efectivo <strong>{formatCOP(session.cashTotal)}</strong>
        </span>
        <span className="cash-summary-item">
          Transferencias <strong>{formatCOP(session.transferTotal)}</strong>
        </span>
      </>
    )}
  </div>
)

export default CashShiftSummary
